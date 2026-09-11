import { ShieldX } from 'lucide-react';
import { BrandLogo } from '../brand-logo';

export default function ForbiddenPage(){return <main className="forbidden-shell"><section><div className="forbidden-brand"><BrandLogo decorative /><strong>David Agency MCC Manager</strong></div><span><ShieldX size={27}/></span><p>403</p><h1>Bạn không có quyền truy cập trang này.</h1><a href="/dashboard">Quay lại Dashboard</a></section></main>}
