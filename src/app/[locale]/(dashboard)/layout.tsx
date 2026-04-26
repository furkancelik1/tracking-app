
import { SplashScreen } from '../../../components/SplashScreen';

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