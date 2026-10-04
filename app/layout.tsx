import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'CondoGest - Gestão de Condomínio',
  description: 'Sistema completo de gestão de condomínio com registro de inquilinos, quartos, escala de funcionários de limpeza, relatórios de manutenção e notificações push.',
  openGraph: {
    title: 'CondoGest - Gestão de Condomínio',
    description: 'Sistema completo de gestão de condomínio com registro de inquilinos, quartos, escala de funcionários de limpeza, relatórios de manutenção e notificações push.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CondoGest - Gestão de Condomínio',
    description: 'Sistema completo de gestão de condomínio com registro de inquilinos, quartos, escala de funcionários de limpeza, relatórios de manutenção e notificações push.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
