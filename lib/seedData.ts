import { collection, writeBatch, doc } from 'firebase/firestore';
import { db, Unit, Tenant, CleaningStaff, CleaningSchedule, MaintenanceReport, Announcement, Payment, OperationType, handleFirestoreError } from './firebase';

export async function seedCondominiumData() {
  const batch = writeBatch(db);

  // 1. Quartos e Unidades em Meticais (MT) - Maputo / Moçambique
  const sampleUnits: Omit<Unit, 'id'>[] = [
    {
      unitNumber: 'Q-101',
      block: 'Bloco A (Vista Baía)',
      floor: '1º Andar',
      type: 'Quarto Suite Individual',
      status: 'occupied',
      rentPrice: 25000, // 25.000 MT
      currentTenantName: 'Arsénio Mabunda',
      features: 'Casa de banho privativa, Ar condicionado Split, Varanda com vista panorâmica para a Baía de Maputo',
      createdAt: new Date().toISOString(),
    },
    {
      unitNumber: 'Q-102',
      block: 'Bloco A (Nascente)',
      floor: '1º Andar',
      type: 'Quarto Individual Standard',
      status: 'available',
      rentPrice: 18500, // 18.500 MT
      features: 'Mobilado, Cama de casal, Guarda-fatos embutido, Ventoinha de teto, Secretária de trabalho',
      createdAt: new Date().toISOString(),
    },
    {
      unitNumber: 'Q-103',
      block: 'Bloco A (Vista Baía)',
      floor: '1º Andar',
      type: 'Estúdio / Kitchenette Climatizada',
      status: 'occupied',
      rentPrice: 32000, // 32.000 MT
      currentTenantName: 'Graça Cossa',
      features: 'Kitchenette equipada, Geleira, Ar condicionado, Varanda privativa, Água quente contínua',
      createdAt: new Date().toISOString(),
    },
    {
      unitNumber: 'Q-201',
      block: 'Bloco B (Poente)',
      floor: '2º Andar',
      type: 'Suite Master com Varanda',
      status: 'available',
      rentPrice: 28000, // 28.000 MT
      features: 'Varanda espaçosa, WC moderno, Ar condicionado, Termoacumulador, Vista para o jardim',
      createdAt: new Date().toISOString(),
    },
    {
      unitNumber: 'Q-202',
      block: 'Bloco B (Poente)',
      floor: '2º Andar',
      type: 'Quarto Duplo Climatizado',
      status: 'maintenance',
      rentPrice: 24000, // 24.000 MT
      features: '2 camas individuais, Ar condicionado, Em reparação do disjuntor elétrico e pintura',
      createdAt: new Date().toISOString(),
    },
    {
      unitNumber: 'Q-203',
      block: 'Bloco B (Poente)',
      floor: '2º Andar',
      type: 'Quarto Individual Executivo',
      status: 'available',
      rentPrice: 19500, // 19.500 MT
      features: 'Muito luminoso, Mobilado, Acesso à cozinha comum do bloco, Internet Fibra 100Mbps',
      createdAt: new Date().toISOString(),
    },
    {
      unitNumber: 'Q-301',
      block: 'Bloco C (Cobertura)',
      floor: '3º Andar',
      type: 'Apartamento T1 Cobertura',
      status: 'occupied',
      rentPrice: 45000, // 45.000 MT
      currentTenantName: 'Delfim Chissano',
      features: 'Sala ampla, Quarto com closet, Cozinha privativa equipada, Terraço privativo com vista mar',
      createdAt: new Date().toISOString(),
    },
    {
      unitNumber: 'Q-302',
      block: 'Bloco C (Cobertura)',
      floor: '3º Andar',
      type: 'Suite Executiva Climatizada',
      status: 'reserved',
      rentPrice: 35000, // 35.000 MT
      features: 'Cama King Size, Ar condicionado Inverter, Secretária ergonómica, Smart TV 55", Termoacumulador',
      createdAt: new Date().toISOString(),
    },
  ];

  sampleUnits.forEach((u) => {
    const ref = doc(collection(db, 'units'));
    batch.set(ref, u);
  });

  // 2. Inquilinos / Moradores com dados Moçambicanos (NUIT, B.I., +258)
  const sampleTenants: Omit<Tenant, 'id'>[] = [
    {
      name: 'Arsénio Mabunda',
      email: 'arsenio.mabunda@gmail.com',
      phone: '+258 84 312 4589',
      document: 'NUIT: 400192837 | BI: 110100482910M',
      unitNumber: 'Q-101',
      status: 'active',
      emergencyContact: 'Teresa Mabunda (Esposa) - +258 84 772 1199',
      moveInDate: '2024-02-01',
      createdAt: new Date().toISOString(),
    },
    {
      name: 'Graça Cossa',
      email: 'graca.cossa@mcel.co.mz',
      phone: '+258 87 456 1230',
      document: 'NUIT: 400781293 | BI: 110200591024F',
      unitNumber: 'Q-103',
      status: 'active',
      emergencyContact: 'Elísio Cossa (Irmão) - +258 82 443 8812',
      moveInDate: '2024-05-15',
      createdAt: new Date().toISOString(),
    },
    {
      name: 'Delfim Chissano',
      email: 'delfim.chissano@standardbank.co.mz',
      phone: '+258 86 987 6543',
      document: 'NUIT: 400349102 | BI: 110100329014M',
      unitNumber: 'Q-301',
      status: 'active',
      emergencyContact: 'Helena Chissano (Mãe) - +258 84 661 5522',
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
      name: 'Dona Rosa Macamo',
      phone: '+258 84 551 2234',
      email: 'rosa.macamo@condominio.co.mz',
      status: 'active' as const,
      shiftPreference: 'Período da Manhã (07:30 - 13:00)',
      notes: 'Especialista em higienização dos halls sociais, átrios e vidraçaria do Bloco A',
      createdAt: new Date().toISOString(),
    },
    {
      id: staff2Id,
      name: 'Mateus Tembe',
      phone: '+258 87 662 3345',
      email: 'mateus.tembe@condominio.co.mz',
      status: 'active' as const,
      shiftPreference: 'Período da Manhã e Tarde',
      notes: 'Responsável pela garagem, área do gerador de emergência e pátio exterior',
      createdAt: new Date().toISOString(),
    },
    {
      id: staff3Id,
      name: 'Amina Guambe',
      phone: '+258 86 773 4456',
      email: 'amina.guambe@condominio.co.mz',
      status: 'active' as const,
      shiftPreference: 'Período da Tarde (13:00 - 18:00)',
      notes: 'Limpeza de escadarias, corredores do piso 2 e 3 e sala de reuniões',
      createdAt: new Date().toISOString(),
    },
  ];

  sampleStaff.forEach((s) => {
    const { id, ...data } = s;
    batch.set(doc(db, 'cleaning_staff', id), data);
  });

  // 4. Escalas de Horários (com turno da manhã destacado)
  const today = new Date().toISOString().split('T')[0];
  const sampleSchedules: Omit<CleaningSchedule, 'id'>[] = [
    {
      staffId: staff1Id,
      staffName: 'Dona Rosa Macamo',
      date: today,
      shift: 'morning',
      departmentOrArea: 'Portaria Principal & Hall da Baía',
      status: 'in_progress',
      notes: 'Desinfeção do balcão, limpeza dos tapetes e polimento do piso',
      createdAt: new Date().toISOString(),
    },
    {
      staffId: staff1Id,
      staffName: 'Dona Rosa Macamo',
      date: today,
      shift: 'morning',
      departmentOrArea: 'Corredores & Átrios (Bloco A - Pisos 1 e 2)',
      status: 'scheduled',
      notes: 'Passagem de mopa úmida e limpeza de vidros panorâmicos',
      createdAt: new Date().toISOString(),
    },
    {
      staffId: staff2Id,
      staffName: 'Mateus Tembe',
      date: today,
      shift: 'morning',
      departmentOrArea: 'Garagem, Área do Gerador & Contentores',
      status: 'in_progress',
      notes: 'Lavagem mecânica do piso da garagem e inspeção do reservatório de água',
      createdAt: new Date().toISOString(),
    },
    {
      staffId: staff2Id,
      staffName: 'Mateus Tembe',
      date: today,
      shift: 'afternoon',
      departmentOrArea: 'Piscina & Zona de Lazer Exterior',
      status: 'scheduled',
      notes: 'Recolha de resíduos, aspiração da piscina e limpeza das mesas de apoio',
      createdAt: new Date().toISOString(),
    },
    {
      staffId: staff3Id,
      staffName: 'Amina Guambe',
      date: today,
      shift: 'afternoon',
      departmentOrArea: 'Escadarias de Emergência & Elevadores',
      status: 'scheduled',
      notes: 'Higienização dos botões dos elevadores, espelhos e corrimões de aço',
      createdAt: new Date().toISOString(),
    },
  ];

  sampleSchedules.forEach((sch) => {
    const ref = doc(collection(db, 'cleaning_schedules'));
    batch.set(ref, sch);
  });

  // 5. Relatórios de Manutenção (Contexto Moçambicano: Climatização, Eletrobomba, EDM)
  const sampleReports: Omit<MaintenanceReport, 'id'>[] = [
    {
      tenantName: 'Arsénio Mabunda',
      tenantContact: '+258 84 312 4589',
      unitNumber: 'Q-101',
      category: 'Ar Condicionado / Ventilação',
      urgency: 'high',
      description: 'O ar condicionado Split do quarto não está a arrefecer devidamente e está a pingar água na parede lateral.',
      status: 'scheduled',
      adminNotes: 'Técnico de climatização Sr. Armando agendado com recarga de gás e desobstrução do dreno.',
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      tenantName: 'Graça Cossa',
      tenantContact: '+258 87 456 1230',
      unitNumber: 'Q-103',
      category: 'Tubos de Água / Canalização / Fugas',
      urgency: 'emergency',
      description: 'Existe uma fuga de água sob o lava-loiça da kitchenette que está a transbordar pelo armário.',
      status: 'open',
      adminNotes: 'Canalizador notificado com máxima urgência. Torneira de segurança fechada temporariamente.',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      tenantName: 'Delfim Chissano',
      tenantContact: '+258 86 987 6543',
      unitNumber: 'Q-301',
      category: 'Portas / Fechaduras & Segurança',
      urgency: 'medium',
      description: 'A fechadura da porta da varanda para o terraço está presa com a maresia e tem dificuldade em trancar.',
      status: 'resolved',
      adminNotes: 'Canhão lubrificado com produto anticorrosivo e chave mestre testada.',
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      resolvedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
  ];

  sampleReports.forEach((rep) => {
    const ref = doc(collection(db, 'maintenance_reports'));
    batch.set(ref, rep);
  });

  // 6. Avisos / Comunicados do Condomínio
  const sampleAnnouncements: Omit<Announcement, 'id'>[] = [
    {
      title: 'Manutenção Preventiva do Gerador & Eletrobomba de Água',
      message: 'Informamos os estimados condóminos que amanhã, entre as 09:30 e as 11:30, será feita a revisão geral do gerador a diesel de emergência e dos filtros da cisterna.',
      priority: 'urgent',
      category: 'Instalações Técnicas',
      sentAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      authorName: 'Administração Baía de Maputo',
    },
    {
      title: 'Assembleia Ordinária de Condóminos - Maputo',
      message: 'Convocatória para a reunião anual no Salão Multiuso na próxima sexta-feira às 18:00. Pauta: Orçamento 2026/2027 com IVA e reforço da segurança patrimonial.',
      priority: 'normal',
      category: 'Assembleia Geral',
      sentAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      authorName: 'Síndico Geral',
    },
    {
      title: 'Limpeza e Desinfeção dos Reservatórios de Água Potável',
      message: 'Pedimos a cooperação de todos para armazenamento prévio de água. A higienização dos tanques superiores decorrerá na terça-feira das 08:00 às 12:00.',
      priority: 'low',
      category: 'Limpeza & Higiene',
      sentAt: new Date(Date.now() - 3600000 * 72).toISOString(),
      authorName: 'Equipa de Zelo',
    },
  ];

  sampleAnnouncements.forEach((an) => {
    const ref = doc(collection(db, 'announcements'));
    batch.set(ref, an);
  });

  // 7. Pagamentos de Mensalidades em Meticais (MT) com Aplicação do IVA (16%)
  // Moçambique: Quota Base + IVA (16%) = Total a Pagar em MT
  const samplePayments: Omit<Payment, 'id'>[] = [
    {
      tenantName: 'Arsénio Mabunda',
      unitNumber: 'Q-101',
      baseAmount: 25000,           // 25.000,00 MT (Base)
      taxRate: 16,                 // 16% IVA
      taxAmount: 4000,             // 4.000,00 MT (IVA 16%)
      amount: 29000,               // 29.000,00 MT (Total)
      currency: 'MT',
      referenceMonth: 'Outubro 2026',
      dueDate: '2026-10-08',
      paymentDate: '2026-10-03',
      status: 'paid',
      paymentMethod: 'M-Pesa (Vodacom)',
      receiptNumber: 'REC-MZ-2026-101',
      notes: 'Recebido via M-Pesa | ID Transação: MP261003.841029. Quitação com IVA a 16%.',
      createdAt: new Date().toISOString(),
    },
    {
      tenantName: 'Graça Cossa',
      unitNumber: 'Q-103',
      baseAmount: 32000,           // 32.000,00 MT (Base)
      taxRate: 16,                 // 16% IVA
      taxAmount: 5120,             // 5.120,00 MT (IVA 16%)
      amount: 37120,               // 37.120,00 MT (Total)
      currency: 'MT',
      referenceMonth: 'Outubro 2026',
      dueDate: '2026-10-08',
      status: 'pending',
      paymentMethod: 'Transferência Bancária - Millennium BIM',
      receiptNumber: 'FAT-MZ-2026-103',
      notes: 'Fatura proforma emitida com IVA 16%. Aguarda confirmação de transferência bancária BIM.',
      createdAt: new Date().toISOString(),
    },
    {
      tenantName: 'Delfim Chissano',
      unitNumber: 'Q-301',
      baseAmount: 45000,           // 45.000,00 MT (Base)
      taxRate: 16,                 // 16% IVA
      taxAmount: 7200,             // 7.200,00 MT (IVA 16%)
      amount: 52200,               // 52.200,00 MT (Total)
      currency: 'MT',
      referenceMonth: 'Setembro 2026',
      dueDate: '2026-09-08',
      paymentDate: '2026-09-06',
      status: 'paid',
      paymentMethod: 'Transferência Bancária - BCI',
      receiptNumber: 'REC-MZ-2026-089',
      notes: 'Comprovativo de transferência BCI verificado pela administração. IVA 16% recolhido.',
      createdAt: new Date().toISOString(),
    },
    {
      tenantName: 'Delfim Chissano',
      unitNumber: 'Q-301',
      baseAmount: 45000,           // 45.000,00 MT (Base)
      taxRate: 16,                 // 16% IVA
      taxAmount: 7200,             // 7.200,00 MT (IVA 16%)
      amount: 52200,               // 52.200,00 MT (Total)
      currency: 'MT',
      referenceMonth: 'Outubro 2026',
      dueDate: '2026-10-05',
      status: 'overdue',
      paymentMethod: 'e-Mola (Movitel)',
      receiptNumber: 'FAT-MZ-2026-301',
      notes: 'Mensalidade em atraso com incidência de IVA 16%. Notificação de cobrança enviada.',
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
