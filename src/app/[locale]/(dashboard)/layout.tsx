
import { SplashScreen } from '../../../components/ui/SplashScreen';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black">
      <SplashScreen />
        {children}
    </div>
  );
}