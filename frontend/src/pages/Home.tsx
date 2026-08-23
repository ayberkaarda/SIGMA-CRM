// Karşılama sayfası — kapalı devre kurumsal CRM'e giriş noktası, bileşen vitrinine bağlantı verir.
import { useNavigate } from 'react-router-dom'
import { Button, Card, CardBody } from '../components/ui'

export default function Home() {
  const navigate = useNavigate()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-0 px-6">
      <Card className="max-w-md text-center">
        <CardBody className="flex flex-col items-center gap-4">
          <h1 className="text-2xl font-semibold text-fg">SIGMA-CRM</h1>
          <p className="text-sm text-fg-muted">
            Kuruluşunuza özel, kapalı devre çalışan kurumsal CRM platformu.
          </p>
          <Button onClick={() => navigate('/showcase')}>Bileşen Vitrinine Git</Button>
        </CardBody>
      </Card>
    </main>
  )
}
