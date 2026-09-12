import type { Metadata } from 'next';
import { LegalPage, SUPPORT_EMAIL } from '../../public-site-shell';
import { publicAlternates } from '../../public-locales';

export const metadata: Metadata = {
  title: 'Chính sách quyền riêng tư | David Agency MCC Manager',
  description: 'Chính sách quyền riêng tư của David Agency MCC Manager.',
  alternates: publicAlternates('privacy', 'vi'),
  openGraph: {
    title: 'Chính sách quyền riêng tư | David Agency MCC Manager',
    description: 'Chính sách quyền riêng tư của David Agency MCC Manager.',
    url: '/vi/privacy-policy',
    locale: 'vi_VN',
    alternateLocale: ['en_US'],
  },
};

export default function VietnamesePrivacyPolicyPage() {
  return (
    <LegalPage
      locale="vi"
      page="privacy"
      title="Chính sách quyền riêng tư của David Agency MCC Manager"
      intro="David Agency MCC Manager tôn trọng quyền riêng tư và cam kết bảo vệ thông tin của người dùng."
    >
      <section>
        <h2>Thông tin chúng tôi truy cập</h2>
        <p>Khi người dùng đăng nhập bằng Google, ứng dụng có thể truy cập thông tin cơ bản của Tài khoản Google cần thiết cho việc xác thực và thông tin tài khoản Google Ads đã được người dùng cho phép.</p>
        <p>Ứng dụng có thể truy cập dữ liệu Google Ads, bao gồm tài khoản MCC, tên tài khoản khách hàng, mã khách hàng, cấu trúc tài khoản và thông tin chi phí quảng cáo.</p>
      </section>
      <section>
        <h2>Cách chúng tôi sử dụng thông tin</h2>
        <p>Chúng tôi chỉ sử dụng thông tin này để cung cấp các chức năng quản lý tài khoản, đồng bộ, báo cáo, theo dõi chi phí và quản lý quyền truy cập của nhân viên được ủy quyền trong David Agency MCC Manager.</p>
      </section>
      <section>
        <h2>Chia sẻ dữ liệu</h2>
        <p>Chúng tôi không bán dữ liệu người dùng Google. Chúng tôi không chia sẻ dữ liệu người dùng Google với bên thứ ba, trừ khi cần thiết để vận hành dịch vụ, tuân thủ pháp luật hiện hành hoặc bảo vệ an toàn của dịch vụ.</p>
      </section>
      <section>
        <h2>Lưu trữ và bảo mật dữ liệu</h2>
        <p>Chúng tôi áp dụng các biện pháp kỹ thuật và tổ chức hợp lý để bảo vệ thông tin người dùng khỏi việc truy cập, sửa đổi, tiết lộ hoặc phá hủy trái phép.</p>
      </section>
      <section>
        <h2>Dịch vụ API của Google</h2>
        <p>Việc David Agency MCC Manager sử dụng và chuyển giao thông tin nhận được từ các API của Google sẽ tuân thủ Chính sách dữ liệu người dùng của Dịch vụ API Google, bao gồm các yêu cầu về Sử dụng hạn chế.</p>
      </section>
      <section>
        <h2>Quyền kiểm soát và thu hồi của người dùng</h2>
        <p>Người dùng có thể thu hồi quyền truy cập đã cấp cho ứng dụng trong phần cài đặt bảo mật của Tài khoản Google bất kỳ lúc nào.</p>
      </section>
      <section>
        <h2>Liên hệ</h2>
        <p>Nếu bạn có câu hỏi về Chính sách quyền riêng tư này, vui lòng liên hệ: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
      </section>
    </LegalPage>
  );
}
