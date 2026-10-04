import { collection, writeBatch, doc } from 'firebase/firestore';
import { db, Unit, Tenant, CleaningStaff, CleaningSchedule, MaintenanceReport, Announcement, Payment, OperationType, handleFirestoreError } from './firebase';

export async function seedCondominiumData() {
  const batch = writeBatch(db);

  // 1. Quartos e Unidades
  const sampleUnits: Omit<Unit, 'id'>[] = [
    {
      unitNumber: 'Q-101',
      block: 'Bloco A (Nascente)',
      floor: '1º Andar',
      type: 'Quarto Suite Individual',
      status: 'occupied',
      rentPrice: 420,
      currentTenantName: 'António Silva',
      features: 'Casa de banho privativa, Ar condicionado, Janela panorâmica',
      createdAt: new Date().toISOString(),
    },
    {
      unitNumber: 'Q-102',
      block: 'Bloco A (Nascente)',
      floor: '1º Andar',
      type: 'Quarto Individual',
      status: 'available',
      rentPrice: 350,
      features: 'Mobilado, Cama de casal, Roupeiro embutido, Secretária de trabalho',
      createdAt: new Date().toISOString(),
    },
    {
      unitNumber: 'Q-103',
      block: 'Bloco A (Nascente)',
      floor: '1º Andar',
      type: 'Estúdio / Kitchenette',
      status: 'occupied',
      rentPrice: 580,
      currentTenantName: 'Beatriz Martins',
      features: 'Kitchenette equipada, Frigorífico, Varanda privativa',
      createdAt: new Date().toISOString(),
    },
    {
      unitNumber: 'Q-201',
      block: 'Bloco B (Poente)',
      floor: '2º Andar',
      type: 'Suite Master com Varanda',
      status: 'available',
      rentPrice: 490,
      features: 'Varanda espaçosa, WC moderno, Ar condicionado, Vista para o jardim',
      createdAt: new Date().toISOString(),
    },
    {
      unitNumber: 'Q-202',
      block: 'Bloco B (Poente)',
      floor: '2º Andar',
      type: 'Quarto Duplo',
      status: 'maintenance',
      rentPrice: 460,
      features: '2 camas individuais, Em processo de pintura e reparo elétrico',
      createdAt: new Date().toISOString(),
    },
    {
      unitNumber: 'Q-203',
      block: 'Bloco B (Poente)',
      floor: '2º Andar',
      type: 'Quarto Individual Standard',
      status: 'available',
      rentPrice: 340,
      features: 'Luminoso, Mobilado, Acesso à cozinha comum',
      createdAt: new Date().toISOString(),
    },
    {
      unitNumber: 'Q-301',
      block: 'Bloco C (Cobertura)',
      floor: '3º Andar',
      type: 'Apartamento T1 Integrado',
      status: 'occupied',
      rentPrice: 720,
      currentTenantName: 'Carlos Eduardo Oliveira',
      features: 'Sala, Quarto com armário, Cozinha privativa, Terraço',
      createdAt: new Date().toISOString(),
    },
    {
      unitNumber: 'Q-302',
      block: 'Bloco C (Cobertura)',
      floor: '3º Andar',
      type: 'Suite Executiva',
      status: 'reserved',
      rentPrice: 520,
      features: 'Mobilada com cama King, Secretária ergonómica, Smart TV',
      createdAt: new Date().toISOString(),
    },
  ];

  sampleUnits.forEach((u) => {
    const ref = doc(collection(db, 'units'));
    batch.set(ref, u);
  });

  // 2. Inquilinos / Clientes
  const sampleTenants: Omit<Tenant, 'id'>[] = [
    {
      name: 'António Silva',
      email: 'antonio.silva@email.pt',
      phone: '+351 912 345 678',
      document: 'NIF: 245981320',
      unitNumber: 'Q-101',
      status: 'active',
      emergencyContact: 'Maria Silva (Mãe) - 918 223 344',
      moveInDate: '2024-02-01',
      createdAt: new Date().toISOString(),
    },
    {
      name: 'Beatriz Martins',
      email: 'beatriz.m@email.pt',
      phone: '+351 923 456 789',
      document: 'NIF: 267104928',
      unitNumber: 'Q-103',
      status: 'active',
      emergencyContact: 'Pedro Martins (Irmão) - 931 556 778',
      moveInDate: '2024-05-15',
      createdAt: new Date().toISOString(),
    },
    {
      name: 'Carlos Eduardo Oliveira',
      email: 'carlos.edu@email.pt',
      phone: '+351 934 567 890',
      document: 'NIF: 231889412',
      unitNumber: 'Q-301',
      status: 'active',
      emergencyContact: 'Helena Oliveira (Esposa) - 964 112 233',
      moveInDate: '2023-11-10',
      createdAt: new Date().toISOString(),
    },
  ];

  sampleTenants.forEach((t) => {
    const ref = doc(collection(db, 'tenants'));
    batch.set(ref, t);
  });

  // 3. Equipa de Limpeza
  const staff1Id = doc(collection(db, 'cleaning_staff')).id;
  const staff2Id = doc(collection(db, 'cleaning_staff')).id;
  const staff3Id = doc(collection(db, 'cleaning_staff')).id;

  const sampleStaff = [
    {
      id: staff1Id,
      name: 'Dona Maria de Fátima',
      phone: '+351 965 112 334',
      email: 'maria.fatima.limpezas@gmail.com',
      status: 'active' as const,
      shiftPreference: 'Período da Manhã (08:00 - 13:00)',
      notes: 'Especialista em higienização de áreas comuns e lavagem de halls',
      createdAt: new Date().toISOString(),
    },
    {
      id: staff2Id,
      name: 'Manuel Rodrigues',
      phone: '+351 961 889 001',
      email: 'manuel.rodrigues@condominio.pt',
      status: 'active' as const,
      shiftPreference: 'Período da Manhã e Tarde',
      notes: 'Responsável pela garagem, depósito de lixo e áreas exteriores da piscina',
      createdAt: new Date().toISOString(),
    },
    {
      id: staff3Id,
      name: 'Carla Vanessa Santos',
      phone: '+351 938 776 554',
      email: 'carla.santos@condominio.pt',
      status: 'active' as const,
      shiftPreference: 'Período da Tarde (13:00 - 18:00)',
      notes: 'Limpeza de escadarias, vidraçaria e salão de eventos',
      createdAt: new Date().toISOString(),
    },
  ];

  sampleStaff.forEach((s) => {
    const { id, ...data } = s;
    batch.set(doc(db, 'cleaning_staff', id), data);
  });

  // 4. Escalas de Horários (com destaque para o período da manhã e departamentos)
  const today = new Date().toISOString().split('T')[0];
  const sampleSchedules: Omit<CleaningSchedule, 'id'>[] = [
    {
      staffId: staff1Id,
      staffName: 'Dona Maria de Fátima',
      date: today,
      shift: 'morning',
      departmentOrArea: 'Hall de Entrada & Portaria Principal',
      status: 'in_progress',
      notes: 'Desinfeção do balcão, limpeza dos tapetes e polimento do piso de granito',
      createdAt: new Date().toISOString(),
    },
    {
      staffId: staff1Id,
      staffName: 'Dona Maria de Fátima',
      date: today,
      shift: 'morning',
      departmentOrArea: 'Corredores & Átrios (Bloco A - Pisos 1 e 2)',
      status: 'scheduled',
      notes: 'Aspiração e passagem de mopa úmida desinfetante',
      createdAt: new Date().toISOString(),
    },
    {
      staffId: staff2Id,
      staffName: 'Manuel Rodrigues',
      date: today,
      shift: 'morning',
      departmentOrArea: 'Garagem Subsolo & Depósito de Lixo',
      status: 'in_progress',
      notes: 'Varrição mecânica, lavagem do depósito e higienização dos contentores',
      createdAt: new Date().toISOString(),
    },
    {
      staffId: staff2Id,
      staffName: 'Manuel Rodrigues',
      date: today,
      shift: 'afternoon',
      departmentOrArea: 'Piscina & Zona de Lazer Exterior',
      status: 'scheduled',
      notes: 'Recolha de folhas, lavagem do deck e organização das espreguiçadeiras',
      createdAt: new Date().toISOString(),
    },
    {
      staffId: staff3Id,
      staffName: 'Carla Vanessa Santos',
      date: today,
      shift: 'afternoon',
      departmentOrArea: 'Escadarias de Emergência & Elevadores',
      status: 'scheduled',
      notes: 'Limpeza dos espelhos dos elevadores, botoneiras e corrimões de aço inox',
      createdAt: new Date().toISOString(),
    },
  ];

  sampleSchedules.forEach((sch) => {
    const ref = doc(collection(db, 'cleaning_schedules'));
    batch.set(ref, sch);
  });

  // 5. Relatórios de Manutenção (Inquilinos reportando defeitos)
  const sampleReports: Omit<MaintenanceReport, 'id'>[] = [
    {
      tenantName: 'António Silva',
      tenantContact: '+351 912 345 678',
      unitNumber: 'Q-101',
      category: 'Instalação Elétrica Defeituosa',
      urgency: 'high',
      description: 'O disjuntor do quarto cai repetidamente ao ligar o aquecedor e a tomada junto à cama faz faísca.',
      status: 'scheduled',
      adminNotes: 'Eletricista Sr. Joaquim agendado para hoje às 15:30 com chave de substituição.',
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      tenantName: 'Beatriz Martins',
      tenantContact: '+351 923 456 789',
      unitNumber: 'Q-103',
      category: 'Tubos de Água / Canalização / Fugas',
      urgency: 'emergency',
      description: 'Existe uma fuga de água constante por baixo do lava-loiça da kitchenette que está a alagar o móvel.',
      status: 'open',
      adminNotes: 'Canalizador notificado com máxima urgência. Válvula de corte recomendada temporariamente.',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      tenantName: 'Carlos Eduardo Oliveira',
      tenantContact: '+351 934 567 890',
      unitNumber: 'Q-301',
      category: 'Portas / Fechaduras & Segurança',
      urgency: 'medium',
      description: 'A fechadura da porta principal da varanda está presa e não tranca com chave.',
      status: 'resolved',
      adminNotes: 'Cilindro e tranca substituídos pela equipa de serralharia.',
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      resolvedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
  ];

  sampleReports.forEach((rep) => {
    const ref = doc(collection(db, 'maintenance_reports'));
    batch.set(ref, rep);
  });

  // 6. Avisos / Comunicados do Condomínio para Notificações Push
  const sampleAnnouncements: Omit<Announcement, 'id'>[] = [
    {
      title: 'Interrupção Temporária de Água para Reparação',
      message: 'Informamos todos os moradores que haverá corte temporário no fornecimento de água amanhã entre as 09:00 e as 11:30 para substituição da válvula principal.',
      priority: 'urgent',
      category: 'Manutenção Hidráulica',
      sentAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      authorName: 'Administração do Condomínio',
    },
    {
      title: 'Assembleia Geral Ordinária de Condomínio',
      message: 'Convocatória para a reunião anual de condóminos na próxima sexta-feira, às 19:30, no Salão de Festas. Pauta: Orçamento 2026/2027 e melhorias de segurança.',
      priority: 'normal',
      category: 'Reunião Geral',
      sentAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      authorName: 'Síndico Geral',
    },
    {
      title: 'Higienização Profunda da Garagem e Lavagem dos Pisos',
      message: 'Pedimos a todos os residentes que retirem viaturas do piso -1 durante o período da manhã da próxima terça-feira para lavagem com água de alta pressão.',
      priority: 'low',
      category: 'Limpeza & Zelo',
      sentAt: new Date(Date.now() - 3600000 * 72).toISOString(),
      authorName: 'Equipa de Zelo e Limpeza',
    },
  ];

  sampleAnnouncements.forEach((an) => {
    const ref = doc(collection(db, 'announcements'));
    batch.set(ref, an);
  });

  // 7. Pagamentos de Mensalidades
  const samplePayments: Omit<Payment, 'id'>[] = [
    {
      tenantName: 'António Silva',
      unitNumber: 'Q-101',
      amount: 420,
      referenceMonth: 'Outubro 2026',
      dueDate: '2026-10-08',
      paymentDate: '2026-10-03',
      status: 'paid',
      paymentMethod: 'MB WAY',
      receiptNumber: 'REC-2026-101',
      notes: 'Pagamento recebido via MB WAY',
      createdAt: new Date().toISOString(),
    },
    {
      tenantName: 'Beatriz Martins',
      unitNumber: 'Q-103',
      amount: 580,
      referenceMonth: 'Outubro 2026',
      dueDate: '2026-10-08',
      status: 'pending',
      paymentMethod: 'Multibanco',
      receiptNumber: 'PEND-2026-103',
      notes: 'Referência Multibanco ativa para pagamento',
      createdAt: new Date().toISOString(),
    },
    {
      tenantName: 'Carlos Eduardo Oliveira',
      unitNumber: 'Q-301',
      amount: 720,
      referenceMonth: 'Setembro 2026',
      dueDate: '2026-09-08',
      paymentDate: '2026-09-06',
      status: 'paid',
      paymentMethod: 'Transferência Bancária',
      receiptNumber: 'REC-2026-089',
      notes: 'Comprovativo de transferência validado',
      createdAt: new Date().toISOString(),
    },
    {
      tenantName: 'Carlos Eduardo Oliveira',
      unitNumber: 'Q-301',
      amount: 720,
      referenceMonth: 'Outubro 2026',
      dueDate: '2026-10-05',
      status: 'overdue',
      paymentMethod: 'Transferência Bancária',
      receiptNumber: 'ATRASO-2026-301',
      notes: 'Lembrete de pagamento em atraso enviado',
      createdAt: new Date().toISOString(),
    },
  ];

  samplePayments.forEach((p) => {
    const ref = doc(collection(db, 'payments'));
    batch.set(ref, p);
  });

  try {
    await batch.commit();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'batch/seed');
    return false;
  }
}
