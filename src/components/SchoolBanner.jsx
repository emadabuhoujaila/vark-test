function UaeFlag({ className = '' }) {
  return (
    <svg
      className={`uae-flag-svg ${className}`}
      viewBox="0 0 120 60"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="علم الإمارات العربية المتحدة"
      role="img"
    >
      <rect x="0" y="0" width="30" height="60" fill="#CE1126" />
      <rect x="30" y="0" width="90" height="20" fill="#00732F" />
      <rect x="30" y="20" width="90" height="20" fill="#FFFFFF" />
      <rect x="30" y="40" width="90" height="20" fill="#000000" />
    </svg>
  );
}

export default function SchoolBanner() {
  return (
    <div className="school-banner">
      <div className="school-banner-flags school-banner-flags-start">
        <UaeFlag />
        <UaeFlag className="uae-flag-sm" />
      </div>

      <div className="school-banner-center">
        <p className="school-ministry">وزارة التربية والتعليم — الإمارات العربية المتحدة</p>
        <p className="school-name">مدرسة محمد بن حمد الشرقي — الحلقة الثانية — بنين</p>
        <p className="uae-pride">فخورين بالإمارات</p>
      </div>

      <div className="school-banner-flags school-banner-flags-end">
        <UaeFlag className="uae-flag-sm" />
        <UaeFlag />
      </div>
    </div>
  );
}
