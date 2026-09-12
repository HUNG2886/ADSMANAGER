import type { Metadata } from 'next';
import { LegalPage, SUPPORT_EMAIL } from '../../public-site-shell';
import { publicAlternates } from '../../public-locales';

export const metadata: Metadata = {
  title: 'Điều khoản dịch vụ | David Agency MCC Manager',
  description: 'Điều khoản dịch vụ của David Agency MCC Manager.',
  alternates: publicAlternates('terms', 'vi'),
  openGraph: {
    title: 'Điều khoản dịch vụ | David Agency MCC Manager',
    description: 'Điều khoản dịch vụ của David Agency MCC Manager.',
    url: '/vi/terms',
    locale: 'vi_VN',
    alternateLocale: ['en_US'],
  },
};

export default function VietnameseTermsPage() {
  return (
    <LegalPage
      locale="vi"
      page="terms"
      title="Điều khoản dịch vụ của David Agency MCC Manager"
      intro="Khi sử dụng David Agency MCC Manager, bạn đồng ý với các Điều khoản dịch vụ này."
    >
      <section>
        <h2>Mục đích của dịch vụ</h2>
        <p>David Agency MCC Manager cung cấp công cụ để người dùng được ủy quyền quản lý và theo dõi tài khoản Google Ads MCC cùng các tài khoản khách hàng liên quan.</p>
      </section>
      <section>
        <h2>Sử dụng được ủy quyền</h2>
        <p>Người dùng chỉ được truy cập những tài khoản Google Ads mà mình có quyền hợp pháp.</p>
      </section>
      <section>
        <h2>Bảo mật tài khoản</h2>
        <p>Người dùng chịu trách nhiệm duy trì an toàn cho Tài khoản Google và mọi hoạt động được thực hiện thông qua quyền truy cập đã cấp.</p>
      </section>
      <section>
        <h2>Tính khả dụng của dịch vụ</h2>
        <p>Dịch vụ có thể được cập nhật, sửa đổi, tạm ngừng hoặc ngừng cung cấp khi cần thiết cho hoạt động bảo trì, bảo mật, tuân thủ hoặc cải thiện dịch vụ.</p>
      </section>
      <section>
        <h2>Hành vi bị cấm</h2>
        <p>Người dùng không được sử dụng dịch vụ cho hoạt động trái pháp luật, truy cập trái phép, lạm dụng dịch vụ của Google hoặc vi phạm chính sách Google Ads.</p>
      </section>
      <section>
        <h2>Liên hệ</h2>
        <p>Nếu có câu hỏi về các điều khoản này, vui lòng liên hệ: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
      </section>
    </LegalPage>
  );
}
