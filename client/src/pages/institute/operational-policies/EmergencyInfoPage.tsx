import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Phone, Hospital, Plus, Edit, Trash2, AlertCircle, Loader2, Save, Heart } from 'lucide-react';

interface EmergencyContact {
  id: number;
  petId: number;
  ownerId: number;
  contactName: string;
  contactPhone: string;
  relationship: string | null;
  designatedHospital: string | null;
  hospitalPhone: string | null;
  hospitalAddress: string | null;
  emergencyTransportConsent: boolean;
  specialInstructions: string | null;
}

interface Pet {
  id: number;
  name: string;
  species: string;
  breed: string | null;
}

export default function EmergencyInfoPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);

  const { data: petsData, isLoading: petsLoading } = useQuery<{ pets: Pet[] }>({
    queryKey: ['/api/pets'],
  });
  const pets = petsData?.pets || [];

  const activePetId = selectedPetId || pets[0]?.id;

  const { data: contactsData, isLoading: contactsLoading } = useQuery<{ success: boolean; contacts: EmergencyContact[] }>({
    queryKey: ['/api/emergency-contacts', activePetId],
    queryFn: async () => {
      const res = await fetch(`/api/emergency-contacts/${activePetId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!activePetId,
  });
  const contacts = contactsData?.contacts || [];

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/emergency-contacts/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emergency-contacts', activePetId] });
      toast({ title: '삭제 완료', description: '응급 연락처가 삭제되었습니다.' });
    },
  });

  if (petsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <AlertCircle className="w-7 h-7 text-destructive" />
        <div>
          <h1 className="text-2xl font-bold">응급 정보 관리</h1>
          <p className="text-gray-500 text-sm">반려견별 비상 연락처와 지정 동물병원을 관리합니다</p>
        </div>
      </div>

      {pets.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>등록된 반려동물이 없습니다.</p>
            <p className="text-sm mt-2">먼저 반려동물을 등록해주세요.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-4">
            <Label>반려동물 선택</Label>
            <Select value={String(activePetId || '')} onValueChange={v => setSelectedPetId(Number(v))}>
              <SelectTrigger><SelectValue placeholder="반려동물 선택" /></SelectTrigger>
              <SelectContent>
                {pets.map(pet => (
                  <SelectItem key={pet.id} value={String(pet.id)}>
                    {pet.name} ({pet.breed || pet.species})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">등록된 응급 연락처</h2>
            <Dialog open={showForm} onOpenChange={(open) => {
              setShowForm(open);
              if (!open) setEditingContact(null);
            }}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-2" />연락처 추가</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingContact ? '응급 연락처 수정' : '응급 연락처 등록'}</DialogTitle>
                </DialogHeader>
                <EmergencyContactForm
                  petId={activePetId!}
                  editingContact={editingContact}
                  onSuccess={() => {
                    setShowForm(false);
                    setEditingContact(null);
                    queryClient.invalidateQueries({ queryKey: ['/api/emergency-contacts', activePetId] });
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          {contactsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : contacts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <Phone className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>등록된 응급 연락처가 없습니다.</p>
                <p className="text-sm mt-2">비상 연락처와 지정 동물병원을 등록해주세요.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {contacts.map(contact => (
                <Card key={contact.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Phone className="w-5 h-5 text-primary" />
                        <span className="font-medium text-lg">{contact.contactName}</span>
                        {contact.relationship && (
                          <Badge variant="outline">{contact.relationship}</Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => {
                          setEditingContact(contact);
                          setShowForm(true);
                        }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteMutation.mutate(contact.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">연락처:</span>
                        <a href={`tel:${contact.contactPhone}`} className="ml-2 text-primary font-medium">{contact.contactPhone}</a>
                      </div>
                      {contact.designatedHospital && (
                        <div className="flex items-center gap-1">
                          <Hospital className="w-4 h-4 text-primary" />
                          <span>{contact.designatedHospital}</span>
                        </div>
                      )}
                      {contact.hospitalPhone && (
                        <div>
                          <span className="text-gray-500">병원 연락처:</span>
                          <a href={`tel:${contact.hospitalPhone}`} className="ml-2 text-primary">{contact.hospitalPhone}</a>
                        </div>
                      )}
                      {contact.hospitalAddress && (
                        <div>
                          <span className="text-gray-500">병원 주소:</span>
                          <span className="ml-2">{contact.hospitalAddress}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-4">
                      <Badge className={contact.emergencyTransportConsent ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-600'}>
                        {contact.emergencyTransportConsent ? '응급 후송 동의' : '응급 후송 미동의'}
                      </Badge>
                    </div>

                    {contact.specialInstructions && (
                      <div className="mt-3 p-3 bg-warning/10 dark:bg-warning/20 rounded-lg">
                        <span className="text-sm font-medium text-warning dark:text-warning">특이사항: </span>
                        <span className="text-sm">{contact.specialInstructions}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmergencyContactForm({ petId, editingContact, onSuccess }: {
  petId: number;
  editingContact: EmergencyContact | null;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    contactName: editingContact?.contactName || '',
    contactPhone: editingContact?.contactPhone || '',
    relationship: editingContact?.relationship || '',
    designatedHospital: editingContact?.designatedHospital || '',
    hospitalPhone: editingContact?.hospitalPhone || '',
    hospitalAddress: editingContact?.hospitalAddress || '',
    emergencyTransportConsent: editingContact?.emergencyTransportConsent || false,
    specialInstructions: editingContact?.specialInstructions || '',
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (editingContact) {
        return apiRequest('PUT', `/api/emergency-contacts/${editingContact.id}`, form);
      }
      return apiRequest('POST', '/api/emergency-contacts', { petId, ...form });
    },
    onSuccess: () => {
      toast({ title: editingContact ? '수정 완료' : '등록 완료', description: '응급 연락처가 저장되었습니다.' });
      onSuccess();
    },
    onError: () => {
      toast({ title: '오류', description: '저장 중 오류가 발생했습니다.', variant: 'destructive' });
    },
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>이름 *</Label>
          <Input value={form.contactName} onChange={e => setForm(p => ({ ...p, contactName: e.target.value }))} placeholder="비상 연락처 이름" />
        </div>
        <div>
          <Label>연락처 *</Label>
          <Input value={form.contactPhone} onChange={e => setForm(p => ({ ...p, contactPhone: e.target.value }))} placeholder="010-0000-0000" />
        </div>
      </div>

      <div>
        <Label>관계</Label>
        <Select value={form.relationship} onValueChange={v => setForm(p => ({ ...p, relationship: v }))}>
          <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="보호자 본인">보호자 본인</SelectItem>
            <SelectItem value="가족">가족</SelectItem>
            <SelectItem value="배우자">배우자</SelectItem>
            <SelectItem value="부모">부모</SelectItem>
            <SelectItem value="친구">친구</SelectItem>
            <SelectItem value="기타">기타</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border-t pt-4">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <Hospital className="w-4 h-4" />
          지정 동물병원
        </h3>
        <div className="space-y-3">
          <div>
            <Label>병원명</Label>
            <Input value={form.designatedHospital} onChange={e => setForm(p => ({ ...p, designatedHospital: e.target.value }))} placeholder="지정 동물병원 이름" />
          </div>
          <div>
            <Label>병원 연락처</Label>
            <Input value={form.hospitalPhone} onChange={e => setForm(p => ({ ...p, hospitalPhone: e.target.value }))} placeholder="02-000-0000" />
          </div>
          <div>
            <Label>병원 주소</Label>
            <Input value={form.hospitalAddress} onChange={e => setForm(p => ({ ...p, hospitalAddress: e.target.value }))} placeholder="서울시 ..." />
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">응급 후송 동의</Label>
            <p className="text-sm text-gray-500">응급 상황 시 지정 동물병원으로 후송에 동의합니다</p>
          </div>
          <Switch checked={form.emergencyTransportConsent} onCheckedChange={v => setForm(p => ({ ...p, emergencyTransportConsent: v }))} />
        </div>
      </div>

      <div>
        <Label>특이사항</Label>
        <Textarea
          value={form.specialInstructions}
          onChange={e => setForm(p => ({ ...p, specialInstructions: e.target.value }))}
          placeholder="알레르기, 복용 중인 약물, 주의사항 등"
        />
      </div>

      <Button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || !form.contactName || !form.contactPhone}
        className="w-full"
      >
        {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        {editingContact ? '수정' : '등록'}
      </Button>
    </div>
  );
}
