import { Express } from 'express';
import { notificationService } from '../notifications/notification-service';
import { csrfProtection } from '../middleware/csrf';
import { db } from '../db';
import { posts as postsTable, users, comments as commentsTable } from '../../shared/schema';
import { eq, desc, sql, and, isNull } from 'drizzle-orm';
import { logServerError } from '../middleware/audit-logger';

export function setupSocialRoutes(app: Express) {
  // Helper function to fetch comments from database with author info
  const fetchCommentsFromDB = async (postId: number) => {
    const rawComments = await db.select({
      id: commentsTable.id,
      content: commentsTable.content,
      postId: commentsTable.postId,
      authorId: commentsTable.authorId,
      parentId: commentsTable.parentId,
      likes: commentsTable.likes,
      isDeleted: commentsTable.isDeleted,
      createdAt: commentsTable.createdAt,
      updatedAt: commentsTable.updatedAt,
      authorName: users.name,
      authorUsername: users.username,
      authorAvatar: users.avatar,
    })
    .from(commentsTable)
    .leftJoin(users, eq(commentsTable.authorId, users.id))
    .where(and(eq(commentsTable.postId, postId), eq(commentsTable.isDeleted, false)))
    .orderBy(desc(commentsTable.createdAt));

    // Transform to nested structure (top-level comments with replies)
    const topLevelComments: any[] = [];
    const repliesMap: Map<number, any[]> = new Map();

    // First pass: separate top-level and replies
    for (const comment of rawComments) {
      const transformedComment = {
        id: comment.id,
        postId: comment.postId,
        content: comment.content,
        authorId: comment.authorId,
        author: {
          id: comment.authorId,
          name: comment.authorName || '익명 사용자',
          username: comment.authorUsername,
          avatar: comment.authorAvatar,
        },
        parentId: comment.parentId,
        likes: comment.likes || 0,
        replies: [],
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
      };

      if (comment.parentId) {
        const parentReplies = repliesMap.get(comment.parentId) || [];
        parentReplies.push(transformedComment);
        repliesMap.set(comment.parentId, parentReplies);
      } else {
        topLevelComments.push(transformedComment);
      }
    }

    // Second pass: attach replies to their parent comments
    for (const comment of topLevelComments) {
      comment.replies = repliesMap.get(comment.id) || [];
    }

    return topLevelComments;
  };

  // 게시글 목록 조회
  app.get('/api/community/posts', async (req, res) => {
    try {
      console.log('[커뮤니티 API] 게시글 목록 조회 요청 받음');
      
      const { page = '1', limit = '12', category, sort, q: searchQuery } = req.query;
      
      console.log(`[커뮤니티 API] 요청 파라미터:`, { page, limit, category, sort, searchQuery });
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      // Build query with user join - using correct column names from actual database
      let allPosts = await db.select({
        id: postsTable.id,
        title: postsTable.title,
        content: postsTable.content,
        authorId: postsTable.authorId,
        category: postsTable.category,
        tag: postsTable.tag,
        image: postsTable.image,
        views: postsTable.views,
        likes: postsTable.likes,
        comments: postsTable.comments,
        locationName: postsTable.locationName,
        locationAddress: postsTable.locationAddress,
        locationLatitude: postsTable.locationLatitude,
        locationLongitude: postsTable.locationLongitude,
        isDeleted: postsTable.isDeleted,
        createdAt: postsTable.createdAt,
        updatedAt: postsTable.updatedAt,
        authorName: users.name,
        authorUsername: users.username,
        authorAvatar: users.avatar,
      })
      .from(postsTable)
      .leftJoin(users, eq(postsTable.authorId, users.id))
      .where(eq(postsTable.isDeleted, false))
      .orderBy(desc(postsTable.createdAt));

      let filteredPosts = [...allPosts];

      // Search query filter
      if (searchQuery && typeof searchQuery === 'string') {
        let decodedQuery = searchQuery;
        try {
          decodedQuery = decodeURIComponent(searchQuery);
        } catch (e) {
          decodedQuery = searchQuery;
        }
        const queryLower = decodedQuery.toLowerCase();
        console.log(`[커뮤니티 API] 검색 쿼리 "${searchQuery}" 받음`);
        console.log(`[커뮤니티 API] 디코딩된 검색 쿼리 "${decodedQuery}" 처리`);
        
        filteredPosts = filteredPosts.filter(post => {
          const titleMatch = post.title?.toLowerCase().includes(queryLower);
          const contentMatch = post.content?.toLowerCase().includes(queryLower);
          const categoryMatch = post.category?.toLowerCase().includes(queryLower);
          const tagMatch = post.tag?.toLowerCase().includes(queryLower);
          const authorMatch = post.authorName?.toLowerCase().includes(queryLower);
          
          return titleMatch || contentMatch || categoryMatch || tagMatch || authorMatch;
        });
        
        console.log(`[커뮤니티 API] 검색 쿼리 "${searchQuery}" 적용 - 결과: ${filteredPosts.length}개`);
      }

      // Category filter
      if (category && category !== 'all') {
        filteredPosts = filteredPosts.filter(post => post.category === category || post.tag === category);
      }

      // Sorting
      if (sort === 'popular') {
        filteredPosts.sort((a, b) => ((b.likes || 0) + (b.views || 0)) - ((a.likes || 0) + (a.views || 0)));
      } else {
        filteredPosts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      }

      // Pagination
      const paginatedPosts = filteredPosts.slice(offset, offset + limitNum);

      // Transform posts for response
      const transformedPosts = paginatedPosts.map(post => {
        return {
          id: post.id,
          title: post.title,
          content: post.content,
          authorId: post.authorId,
          tag: post.tag || post.category || '',
          category: post.category,
          image: post.image,
          views: post.views || 0,
          viewCount: post.views || 0,
          likes: post.likes || 0,
          comments: post.comments || 0,
          commentsCount: post.comments || 0,
          locationName: post.locationName,
          locationAddress: post.locationAddress,
          locationLatitude: post.locationLatitude,
          locationLongitude: post.locationLongitude,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          hidden: post.isDeleted,
          author: {
            id: post.authorId,
            name: post.authorName || '익명 사용자',
            username: post.authorUsername,
            avatar: post.authorAvatar,
          },
        };
      });

      console.log(`[커뮤니티 API] 게시글 목록 조회 - 전체: ${allPosts.length}개, 필터링: ${filteredPosts.length}개`);
      
      res.json({
        posts: transformedPosts,
        total: filteredPosts.length,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(filteredPosts.length / limitNum),
          totalItems: filteredPosts.length,
          hasNext: offset + limitNum < filteredPosts.length,
          hasPrev: pageNum > 1
        }
      });
    } catch (error) {
      logServerError('게시글 목록 조회 오류:', error, req);
      res.status(500).json({ error: '게시글을 불러오는데 실패했습니다.' });
    }
  });

  // 게시글 상세 조회
  app.get('/api/community/posts/:id', async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      
      const [post] = await db.select({
        id: postsTable.id,
        title: postsTable.title,
        content: postsTable.content,
        authorId: postsTable.authorId,
        category: postsTable.category,
        tag: postsTable.tag,
        image: postsTable.image,
        views: postsTable.views,
        likes: postsTable.likes,
        comments: postsTable.comments,
        locationName: postsTable.locationName,
        locationAddress: postsTable.locationAddress,
        locationLatitude: postsTable.locationLatitude,
        locationLongitude: postsTable.locationLongitude,
        isDeleted: postsTable.isDeleted,
        createdAt: postsTable.createdAt,
        updatedAt: postsTable.updatedAt,
        authorName: users.name,
        authorUsername: users.username,
        authorAvatar: users.avatar,
      })
      .from(postsTable)
      .leftJoin(users, eq(postsTable.authorId, users.id))
      .where(eq(postsTable.id, postId));

      if (!post) {
        return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
      }

      // Increment view count
      await db.update(postsTable)
        .set({ views: sql`${postsTable.views} + 1` })
        .where(eq(postsTable.id, postId));

      const transformedPost = {
        id: post.id,
        title: post.title,
        content: post.content,
        authorId: post.authorId,
        tag: post.tag || post.category || '',
        category: post.category,
        image: post.image,
        views: (post.views || 0) + 1,
        viewCount: (post.views || 0) + 1,
        likes: post.likes || 0,
        comments: await fetchCommentsFromDB(post.id),
        commentsCount: post.comments || 0,
        locationName: post.locationName,
        locationAddress: post.locationAddress,
        locationLatitude: post.locationLatitude,
        locationLongitude: post.locationLongitude,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        hidden: post.isDeleted,
        author: {
          id: post.authorId,
          name: post.authorName || '익명 사용자',
          username: post.authorUsername,
          avatar: post.authorAvatar,
        },
      };

      res.json({ post: transformedPost });
    } catch (error) {
      logServerError('게시글 상세 조회 오류:', error, req);
      res.status(500).json({ error: '게시글을 불러오는데 실패했습니다.' });
    }
  });

  // 게시글 작성
  app.post('/api/community/posts', csrfProtection, async (req, res) => {
    try {
      const { 
        title, content, category = '일반', tag, image,
        locationName, locationAddress, locationLatitude, locationLongitude 
      } = req.body;

      if (!title || !content) {
        return res.status(400).json({ error: '제목과 내용을 입력해주세요.' });
      }

      // Get authorId from session or default to null
      const authorId = req.session?.user?.id || null;

      const [newPost] = await db.insert(postsTable).values({
        title,
        content,
        category: category,
        tag: tag || category,
        image: image || null,
        authorId,
        views: 0,
        likes: 0,
        comments: 0,
        locationName: locationName || null,
        locationAddress: locationAddress || null,
        locationLatitude: locationLatitude || null,
        locationLongitude: locationLongitude || null,
        isDeleted: false,
      }).returning();

      // Fetch author info
      let authorInfo = { id: authorId, name: '반려인', username: 'user', avatar: null };
      if (authorId) {
        const [author] = await db.select({
          id: users.id,
          name: users.name,
          username: users.username,
          avatar: users.avatar,
        }).from(users).where(eq(users.id, authorId));
        if (author) {
          authorInfo = author;
        }
      }

      const transformedPost = {
        id: newPost.id,
        title: newPost.title,
        content: newPost.content,
        authorId: newPost.authorId,
        tag: newPost.tag || newPost.category || '',
        category: newPost.category,
        image: newPost.image,
        views: 0,
        viewCount: 0,
        likes: 0,
        comments: [],
        createdAt: newPost.createdAt,
        updatedAt: newPost.updatedAt,
        hidden: false,
        author: authorInfo,
        locationName: newPost.locationName,
        locationAddress: newPost.locationAddress,
        locationLatitude: newPost.locationLatitude,
        locationLongitude: newPost.locationLongitude,
      };

      res.status(201).json({ 
        message: '게시글이 작성되었습니다.',
        post: transformedPost 
      });
    } catch (error) {
      logServerError('게시글 작성 오류:', error, req);
      res.status(500).json({ error: '게시글 작성에 실패했습니다.' });
    }
  });

  // 게시글 삭제
  app.delete('/api/community/posts/:id', csrfProtection, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      
      const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId));

      if (!post) {
        return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
      }

      await db.delete(postsTable).where(eq(postsTable.id, postId));
      
      // Also remove comments from database
      await db.delete(commentsTable).where(eq(commentsTable.postId, postId));

      res.json({ message: '게시글이 삭제되었습니다.' });
    } catch (error) {
      logServerError('게시글 삭제 오류:', error, req);
      res.status(500).json({ error: '게시글 삭제에 실패했습니다.' });
    }
  });

  // 게시글 좋아요 토글
  app.post('/api/community/posts/:id/like', csrfProtection, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      
      const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId));

      if (!post) {
        return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
      }

      // Increment likes
      const [updatedPost] = await db.update(postsTable)
        .set({ likes: sql`${postsTable.likes} + 1` })
        .where(eq(postsTable.id, postId))
        .returning();

      // Send notification to post author
      if (post.authorId && post.authorId !== req.session?.user?.id) {
        try {
          await notificationService.sendNotification({
            userId: post.authorId,
            type: 'system',
            title: '새로운 좋아요',
            message: `회원님의 게시글 "${post.title?.substring(0, 30)}${(post.title?.length || 0) > 30 ? '...' : ''}"에 좋아요가 추가되었습니다.`,
            actionUrl: `/community/posts/${post.id}`,
            data: { postId: post.id }
          });
        } catch (notifyError) {
          logServerError('[좋아요] 알림 발송 실패:', notifyError, req);
        }
      }

      res.json({ 
        message: '좋아요가 추가되었습니다.',
        likes: updatedPost.likes,
        postId: post.id
      });
    } catch (error) {
      logServerError('좋아요 처리 오류:', error, req);
      res.status(500).json({ error: '좋아요 처리에 실패했습니다.' });
    }
  });

  // 게시글 수정
  app.put('/api/community/posts/:id', csrfProtection, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const { title, content, category, tag, image } = req.body;

      if (!title || !content) {
        return res.status(400).json({ error: '제목과 내용을 입력해주세요.' });
      }

      const [existingPost] = await db.select().from(postsTable).where(eq(postsTable.id, postId));
      
      if (!existingPost) {
        return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
      }

      const [updatedPost] = await db.update(postsTable)
        .set({
          title,
          content,
          category: category || existingPost.category,
          tag: tag || category || existingPost.tag,
          image: image !== undefined ? image : existingPost.image,
          updatedAt: new Date(),
        })
        .where(eq(postsTable.id, postId))
        .returning();

      // Fetch author info
      let authorInfo = { id: updatedPost.authorId, name: '익명 사용자', username: null, avatar: null };
      if (updatedPost.authorId) {
        const [author] = await db.select({
          id: users.id,
          name: users.name,
          username: users.username,
          avatar: users.avatar,
        }).from(users).where(eq(users.id, updatedPost.authorId));
        if (author) {
          authorInfo = author;
        }
      }

      const transformedPost = {
        id: updatedPost.id,
        title: updatedPost.title,
        content: updatedPost.content,
        authorId: updatedPost.authorId,
        tag: updatedPost.tag || updatedPost.category || '',
        category: updatedPost.category,
        image: updatedPost.image,
        views: updatedPost.views || 0,
        likes: updatedPost.likes || 0,
        comments: await fetchCommentsFromDB(updatedPost.id),
        createdAt: updatedPost.createdAt,
        updatedAt: updatedPost.updatedAt,
        hidden: updatedPost.isDeleted,
        author: authorInfo,
      };

      res.json({ 
        message: '게시글이 수정되었습니다.',
        post: transformedPost
      });
    } catch (error) {
      logServerError('게시글 수정 오류:', error, req);
      res.status(500).json({ error: '게시글 수정에 실패했습니다.' });
    }
  });

  // 댓글 목록 조회 (PostgreSQL)
  app.get('/api/community/posts/:id/comments', async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      
      // Check if post exists
      const [post] = await db.select({ id: postsTable.id }).from(postsTable).where(eq(postsTable.id, postId));

      if (!post) {
        return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
      }

      const comments = await fetchCommentsFromDB(postId);

      res.json({ 
        comments: comments,
        total: comments.length
      });
    } catch (error) {
      logServerError('댓글 조회 오류:', error, req);
      res.status(500).json({ error: '댓글을 불러오는데 실패했습니다.' });
    }
  });

  // 댓글 작성 (PostgreSQL)
  app.post('/api/community/posts/:id/comments', csrfProtection, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const { content, parentId } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: '댓글 내용을 입력해주세요.' });
      }

      if (content.length > 1000) {
        return res.status(400).json({ error: '댓글은 1000자 이내로 작성해주세요.' });
      }

      // Check if post exists
      const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId));
      
      if (!post) {
        return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
      }

      const authorId = req.session?.user?.id || null;

      // If parentId is provided, verify the parent comment exists
      if (parentId) {
        const [parentComment] = await db.select({ id: commentsTable.id })
          .from(commentsTable)
          .where(and(eq(commentsTable.id, parentId), eq(commentsTable.postId, postId)));
        
        if (!parentComment) {
          return res.status(404).json({ error: '상위 댓글을 찾을 수 없습니다.' });
        }
      }

      // Insert new comment into database
      const [insertedComment] = await db.insert(commentsTable).values({
        content: content.trim(),
        postId: postId,
        authorId: authorId,
        parentId: parentId || null,
        isDeleted: false,
      }).returning();

      // Fetch author info
      let authorInfo = { 
        id: authorId, 
        username: req.session?.user?.username || 'user', 
        name: req.session?.user?.name || '반려인', 
        avatar: null 
      };
      if (authorId) {
        const [author] = await db.select({
          id: users.id,
          name: users.name,
          username: users.username,
          avatar: users.avatar,
        }).from(users).where(eq(users.id, authorId));
        if (author) {
          authorInfo = author;
        }
      }

      const newComment = {
        id: insertedComment.id,
        postId: insertedComment.postId,
        content: insertedComment.content,
        authorId: insertedComment.authorId,
        author: authorInfo,
        parentId: insertedComment.parentId,
        likes: 0,
        replies: [],
        createdAt: insertedComment.createdAt,
        updatedAt: insertedComment.updatedAt
      };

      // Update comments count in database
      await db.update(postsTable)
        .set({ comments: sql`${postsTable.comments} + 1` })
        .where(eq(postsTable.id, postId));

      // Send notification to post author
      if (post.authorId && post.authorId !== authorId) {
        try {
          await notificationService.sendNotification({
            userId: post.authorId,
            type: 'system',
            title: '새로운 댓글',
            message: `회원님의 게시글 "${post.title?.substring(0, 30)}${(post.title?.length || 0) > 30 ? '...' : ''}"에 새 댓글이 달렸습니다.`,
            actionUrl: `/community/posts/${post.id}`,
            data: { postId: post.id, commentId: insertedComment.id }
          });
        } catch (notifyError) {
          logServerError('[댓글] 알림 발송 실패:', notifyError, req);
        }
      }

      res.status(201).json({ 
        message: parentId ? '대댓글이 작성되었습니다.' : '댓글이 작성되었습니다.',
        comment: newComment 
      });
    } catch (error) {
      logServerError('댓글 작성 오류:', error, req);
      res.status(500).json({ error: '댓글 작성에 실패했습니다.' });
    }
  });

  // 댓글 삭제 (PostgreSQL)
  app.delete('/api/community/posts/:postId/comments/:commentId', csrfProtection, async (req, res) => {
    try {
      const postId = parseInt(req.params.postId);
      const commentId = parseInt(req.params.commentId);

      // Check if post exists
      const [post] = await db.select({ id: postsTable.id }).from(postsTable).where(eq(postsTable.id, postId));
      
      if (!post) {
        return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
      }

      // Find the comment
      const [comment] = await db.select({ id: commentsTable.id, parentId: commentsTable.parentId })
        .from(commentsTable)
        .where(and(eq(commentsTable.id, commentId), eq(commentsTable.postId, postId), eq(commentsTable.isDeleted, false)));

      if (!comment) {
        return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
      }

      // Count replies to be deleted (if this is a parent comment)
      const replies = await db.select({ id: commentsTable.id })
        .from(commentsTable)
        .where(and(eq(commentsTable.parentId, commentId), eq(commentsTable.isDeleted, false)));
      
      const totalToDelete = 1 + replies.length;

      // Delete the comment and its replies from database
      await db.delete(commentsTable)
        .where(and(eq(commentsTable.id, commentId), eq(commentsTable.postId, postId)));
      
      // Also delete any replies to this comment
      if (replies.length > 0) {
        await db.delete(commentsTable)
          .where(eq(commentsTable.parentId, commentId));
      }

      // Update comments count
      await db.update(postsTable)
        .set({ comments: sql`GREATEST(${postsTable.comments} - ${totalToDelete}, 0)` })
        .where(eq(postsTable.id, postId));

      const message = comment.parentId ? '답글이 삭제되었습니다.' : '댓글이 삭제되었습니다.';
      return res.json({ message });
    } catch (error) {
      logServerError('댓글 삭제 오류:', error, req);
      res.status(500).json({ error: '댓글 삭제에 실패했습니다.' });
    }
  });

  // 댓글 좋아요 (PostgreSQL)
  app.post('/api/community/posts/:postId/comments/:commentId/like', csrfProtection, async (req, res) => {
    try {
      const postId = parseInt(req.params.postId);
      const commentId = parseInt(req.params.commentId);

      const [post] = await db.select({ id: postsTable.id }).from(postsTable).where(eq(postsTable.id, postId));
      
      if (!post) {
        return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
      }

      // Check if comment exists
      const [comment] = await db.select({ id: commentsTable.id, parentId: commentsTable.parentId, likes: commentsTable.likes })
        .from(commentsTable)
        .where(and(eq(commentsTable.id, commentId), eq(commentsTable.postId, postId), eq(commentsTable.isDeleted, false)));

      if (!comment) {
        return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
      }

      // Update likes in database
      const [updatedComment] = await db.update(commentsTable)
        .set({ likes: sql`COALESCE(${commentsTable.likes}, 0) + 1` })
        .where(eq(commentsTable.id, commentId))
        .returning({ likes: commentsTable.likes });

      const message = comment.parentId ? '답글에 좋아요가 추가되었습니다.' : '댓글에 좋아요가 추가되었습니다.';
      return res.json({ message, likes: updatedComment.likes });
    } catch (error) {
      logServerError('댓글 좋아요 오류:', error, req);
      res.status(500).json({ error: '좋아요 처리에 실패했습니다.' });
    }
  });

  console.log('[Social Routes] 커뮤니티 소셜 라우트가 등록되었습니다.');
}
