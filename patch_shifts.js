const fs = require('fs');

let code = fs.readFileSync('web/src/app/shifts/page.tsx', 'utf8');

// 1. Add staff SWR and selectedStaff state
const targetState = `  const [openingAmount, setOpeningAmount] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [loading, setLoading] = useState(false);`;

const newState = `  const [openingAmount, setOpeningAmount] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // For manager to open shifts for others
  const [selectedStaffEmail, setSelectedStaffEmail] = useState("");
  const [selectedStaffName, setSelectedStaffName] = useState("");

  const { data: staffData } = useSWR(
    user?.role === "manager"
      ? \`\${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/admin/pharmacies/\${user.pharmacy_id}/staff\`
      : null,
    fetcher
  );
  const staffList = staffData?.staff || [];
  
  // Set default to logged in user when modal opens
  useEffect(() => {
    if (showOpenModal && user) {
      setSelectedStaffEmail(user.email || "");
      setSelectedStaffName(user.managerName || user.username || "");
    }
  }, [showOpenModal, user]);`;

code = code.replace(targetState, newState);

// 2. Patch handleOpenShift
const targetOpen = `          body: JSON.stringify({
            cashier_name: user?.managerName || user?.username || "",
            cashier_email: user?.email || "",
            opening_amount: parseFloat(openingAmount),
          }),`;

const newOpen = `          body: JSON.stringify({
            cashier_name: selectedStaffName || user?.managerName || user?.username || "",
            cashier_email: selectedStaffEmail || user?.email || "",
            opening_amount: parseFloat(openingAmount),
          }),`;
          
code = code.replace(targetOpen, newOpen);

// 3. Patch UI
const targetUI = `            <div className="space-y-4">
              <div className="bg-bg rounded-xl p-3 text-[14px] font-bold text-ink">
                الكاشير: {user?.managerName || user?.username}
              </div>`;

const newUI = `            <div className="space-y-4">
              {user?.role === "manager" ? (
                <div>
                  <label className="block text-[13px] font-bold text-ink-soft mb-1.5">
                    تعيين الوردية للموظف (للمدير فقط)
                  </label>
                  <select
                    value={selectedStaffEmail}
                    onChange={(e) => {
                      setSelectedStaffEmail(e.target.value);
                      const selected = staffList.find((s: any) => s.email === e.target.value);
                      if (selected) setSelectedStaffName(selected.name);
                      else if (e.target.value === user.email) setSelectedStaffName(user.managerName || user.username || "");
                    }}
                    className="w-full bg-white border border-mint-line rounded-xl px-4 py-3 text-[14px] font-bold text-teal outline-none focus:border-primary"
                  >
                    <option value={user?.email || ""}>أنا ({user?.managerName || user?.username})</option>
                    {staffList.map((s: any) => (
                      s.email !== user?.email && (
                        <option key={s.id} value={s.email}>
                          {s.name} ({s.role})
                        </option>
                      )
                    ))}
                  </select>
                </div>
              ) : (
                <div className="bg-bg rounded-xl p-3 text-[14px] font-bold text-ink flex items-center gap-2 border border-mint-line">
                  <svg className="w-5 h-5 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>الكاشير: {user?.managerName || user?.username}</span>
                </div>
              )}`;

code = code.replace(targetUI, newUI);

fs.writeFileSync('web/src/app/shifts/page.tsx', code, 'utf8');
console.log("Patched shifts page for manager assignments");
