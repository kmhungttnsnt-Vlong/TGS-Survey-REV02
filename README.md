# TGS-Survey-REV02
TGS Platform Survey Wed REV02
# TGS Platform Genesis 2.0

**Ứng dụng khảo sát hiện trường và số hóa hạ tầng cấp nước**

- **Tên sản phẩm:** TGS Platform Genesis 2.0
- **Tên ứng dụng:** TGS Survey
- **Phạm vi:** WebApp thử nghiệm nghiệp vụ khảo sát hiện trường
- **Ngôn ngữ giao diện:** Tiếng Việt
- **Trạng thái tài liệu:** Bản mô tả dự án
- **Vai trò:** Phòng thí nghiệm UX và nghiệp vụ cho TGS Android

## 1. Giới thiệu

TGS Platform Genesis 2.0 là WebApp phục vụ việc thử nghiệm các quy trình khảo sát hiện trường đối với công trình hạ tầng cấp nước và tuyến ống.

Ứng dụng tập trung vào quản lý công trình khảo sát, thu thập tọa độ, khảo sát tuyến, khảo sát điểm/trạm, ghi nhận ảnh và video, lưu dữ liệu cục bộ và chuẩn bị dữ liệu để xuất hoặc đồng bộ.

WebApp được sử dụng để đánh giá luồng nghiệp vụ và trải nghiệm thực tế trước khi xem xét đưa các cải tiến phù hợp vào TGS Android.

## 2. Mục tiêu

- Giảm thao tác nhập liệu lặp lại tại hiện trường.
- Liên kết dữ liệu khảo sát với công trình, tuyến, điểm và bằng chứng.
- Hỗ trợ ghi nhận dữ liệu khi kết nối mạng không ổn định.
- Tạo cơ sở cho việc kiểm tra, tổng hợp và lập hồ sơ kỹ thuật.
- Thử nghiệm các cải tiến UX trước khi đề xuất thay đổi Android.

## 3. Chức năng

### 3.1. Quản lý công trình
- Tạo công trình khảo sát.
- Lưu và tiếp tục công trình đang thực hiện.
- Theo dõi trạng thái công trình.
- Xem danh sách công trình đã lưu.

### 3.2. Khảo sát tuyến
- Hiển thị bản đồ.
- Thu thập vị trí từ thiết bị.
- Ghi nhận các điểm khảo sát tuyến.
- Theo dõi và tổng hợp thông tin tuyến.

### 3.3. Khảo sát điểm và trạm
- Ghi nhận điểm hoặc hạng mục khảo sát.
- Thu thập tọa độ và ghi chú.
- Liên kết thông tin khảo sát với bằng chứng liên quan.

### 3.4. Ảnh và video
- Truy cập camera khi được cấp quyền.
- Chụp ảnh và quay video.
- Xem lại bằng chứng đã ghi nhận.
- Hỗ trợ liên kết media với công trình khảo sát.

### 3.5. Lưu trữ và trao đổi dữ liệu
- Lưu thông tin công trình trong IndexedDB.
- Xuất dữ liệu theo chức năng hiện có.
- Hỗ trợ quy trình gửi dữ liệu đến máy chủ.
- Theo dõi và xử lý lỗi cần thiết trước khi xác nhận hoàn thành đồng bộ.

## 4. Công nghệ

Các công nghệ thể hiện trong bộ mã nguồn hiện tại:

- HTML, CSS và JavaScript.
- IndexedDB cho dữ liệu cục bộ trên trình duyệt.
- Leaflet cho bản đồ.
- Dịch vụ bản đồ bên ngoài.
- MediaDevices và MediaRecorder cho các chức năng camera/video được trình duyệt hỗ trợ.
- Web App Manifest cho cấu hình cài đặt PWA.

Khả năng thực tế phụ thuộc vào trình duyệt, thiết bị, quyền truy cập, kết nối mạng và cấu hình máy chủ.

## 5. Cấu trúc file

| File | Vai trò |
|---|---|
| `index.html` | Cấu trúc giao diện và các màn hình |
| `style.css` | Kiểu dáng, bố cục và thành phần giao diện |
| `app.js` | Luồng nghiệp vụ và tương tác ứng dụng |
| `db.js` | Lớp lưu trữ dữ liệu IndexedDB |
| `manifest.json` | Tên ứng dụng, màu giao diện và cấu hình PWA |
| `icon-192.png` | Biểu tượng ứng dụng kích thước 192 × 192 |
| `icon-512.png` | Biểu tượng ứng dụng kích thước 512 × 512 |

## 6. Khởi chạy

1. Đặt các file ứng dụng trong cấu trúc thư mục dự án.
2. Kiểm tra các đường dẫn đến CSS, JavaScript, manifest và biểu tượng.
3. Phục vụ ứng dụng qua môi trường HTTP/HTTPS phù hợp; không mặc định rằng mở trực tiếp bằng `file://` sẽ hỗ trợ đầy đủ các API.
4. Cấp quyền vị trí và camera khi cần.
5. Kiểm tra khả năng khởi tạo IndexedDB, tạo công trình, lưu dữ liệu và khôi phục dữ liệu sau khi tải lại.
6. Kiểm tra riêng các chức năng cần kết nối máy chủ.

**Lưu ý:** Chưa coi ứng dụng là có khả năng hoạt động ngoại tuyến hoàn toàn nếu chưa xác minh service worker, cache ứng dụng, dữ liệu bản đồ và các tài nguyên phụ thuộc bên ngoài.

## 7. Nguyên tắc dữ liệu và bằng chứng

- Mỗi dữ liệu khảo sát phải gắn với đúng công trình và ngữ cảnh nghiệp vụ.
- Không coi tọa độ từ điện thoại là kết quả đo đạc chuyên dụng nếu chưa đủ căn cứ.
- Phân biệt dữ liệu gốc, dữ liệu đã xử lý và dữ liệu đã xác minh.
- Bảo toàn tệp bằng chứng gốc và lịch sử xử lý.
- Không xác nhận đồng bộ hoàn tất chỉ dựa vào một phản hồi thành công đơn lẻ.
- Dữ liệu chưa xác minh phải được đánh dấu rõ ràng.

## 8. Bảo mật

Không đưa API token, PIN, mật khẩu hoặc thông tin xác thực thực vào mã nguồn công khai.

Việc xác thực, phân quyền và kiểm tra quyền truy cập dữ liệu phải được thiết kế phù hợp với môi trường triển khai. URL thử nghiệm không được mặc định là endpoint sản xuất.

## 9. Quan hệ với TGS Android

WebApp là môi trường thử nghiệm nghiệp vụ và UX; không phải kiến trúc tham chiếu bắt buộc của Android.

TGS Android tiếp tục tuân thủ các baseline và quyết định kiến trúc đã được phê duyệt. Chỉ đưa các cải tiến từ WebApp sang Android sau khi:

1. Xác định rõ giá trị nghiệp vụ.
2. Kiểm tra tác động đến dữ liệu và các module liên quan.
3. Đối chiếu baseline hiện hành.
4. Đề xuất thay đổi có phạm vi cụ thể.
5. Thực hiện kiểm thử và ghi nhận kết quả trước khi khóa thay đổi.

## 10. Trạng thái và giới hạn

Tài liệu này mô tả các chức năng thể hiện trong bộ file được cung cấp; không phải chứng nhận rằng mọi chức năng đã vượt qua kiểm thử.

Các hạng mục cần xác minh trước khi sử dụng cho nghiệp vụ chính thức gồm:

- Độ chính xác và cấu hình hệ tọa độ.
- Migration và tính toàn vẹn dữ liệu cục bộ.
- Khả năng phục hồi sau lỗi hoặc mất mạng.
- Xác thực, phân quyền và bảo mật máy chủ.
- Tính đầy đủ của quy trình đồng bộ.
- Khả năng bảo toàn và truy xuất bằng chứng.
- Khả năng hoạt động ngoại tuyến của giao diện và bản đồ.

## 11. Nguyên tắc phát triển

Ưu tiên độ tin cậy dữ liệu, tính liên tục khi làm việc ngoài hiện trường, khả năng truy xuất bằng chứng và kiểm soát thay đổi.

Không tự ý thay đổi baseline Android đã khóa. Mọi đề xuất phải nêu rõ lợi ích, rủi ro, phạm vi tác động và tiêu chí nghiệm thu.
