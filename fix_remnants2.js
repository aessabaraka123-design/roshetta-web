const fs = require('fs');

const replacements = {
    'web/src/components/MainLayoutWrapper.tsx': [
        ['التطبيق في وضع القراءة فقط، انتظار موافقة المسؤول على تأكيد الاشتراك راجع إيصالك.', '{language === "en" ? "App in Read-Only mode. Awaiting admin approval. Please check your receipt." : "التطبيق في وضع القراءة فقط، انتظار موافقة المسؤول على تأكيد الاشتراك راجع إيصالك."}']
    ],
    'web/src/components/SearchBar.tsx': [
        ['placeholder="ابحث..."', 'placeholder={language === "en" ? "Search..." : "ابحث..."}']
    ],
    'web/src/components/Sidebar.tsx': [
        ['>صيدلي أول<', '>{language === "en" ? "Senior Pharmacist" : "صيدلي أول"}<']
    ],
    'web/src/components/SocketProvider.tsx': [
        ['تم تفعيل اشتراكك بنجاح يمكنك الآن استخدام النظام بالكامل', '${language === "en" ? "Subscription activated successfully. You can now use the full system." : "تم تفعيل اشتراكك بنجاح يمكنك الآن استخدام النظام بالكامل"}']
    ],
    'web/src/store/index.ts': [
        ['primaryUnit: "علبة"', 'primaryUnit: "Box"']
    ]
};

for (const [file_path, reps] of Object.entries(replacements)) {
    if (fs.existsSync(file_path)) {
        let content = fs.readFileSync(file_path, 'utf8');
        for (const [old, newVal] of reps) {
            content = content.split(old).join(newVal);
        }
        fs.writeFileSync(file_path, content, 'utf8');
        console.log('Updated', file_path);
    }
}
