import { useEffect, useState } from 'react';
import baseApi from '../config/api';
import { useAuth } from '../hooks/useAuth';
// import { ProfilingWizard } from '../features/profiling';

function PassportPage() {
  const { user } = useAuth();
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBusiness = async () => {
      if (user) {
        try {
          const { data } = await baseApi.get('/businesses/me');
          setBusiness(data.data);
        } catch (err) {
          setBusiness(null);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchBusiness();
  }, [user]);

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!business) {
    return (
      <div className="p-8 text-center bg-white rounded-lg shadow-sm border border-slate-200">
        <h3 className="text-lg font-medium text-slate-900">Business Profile Required</h3>
        <p className="mt-2 text-slate-500">Please complete your Profile Setup first to access the risk profiling passport.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
      {/* <ProfilingWizard
        businessId={business.id}
        onComplete={() => console.log('Passport profiling complete')}
      /> */}
    </div>
  );
}

export default PassportPage;
