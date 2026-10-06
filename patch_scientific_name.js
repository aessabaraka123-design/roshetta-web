const fs = require('fs');
let code = fs.readFileSync('web/src/app/add-item/page.tsx', 'utf8');

// 1. Add scientificName to formData
const targetState = `  const [formData, setFormData] = useState({
    name: "",
    manufacturer: "",`;

const newState = `  const [formData, setFormData] = useState({
    name: "",
    scientificName: "",
    manufacturer: "",`;

if (code.includes(targetState)) code = code.replace(targetState, newState);

// 2. Change the UI
const targetUI = `        <div>
          <label className="block text-[14px] font-semibold text-ink-soft mb-2">
            اسم الدواء
          </label>
          <div className="bg-card border-2 border-mint-line rounded-xl p-3.5">
            <input
              required
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="مثال: أوجمنتين ١g"
              className="w-full bg-transparent border-none outline-none text-[16px] text-ink placeholder:text-[#A6B8AE]"
              dir="auto"
            />
          </div>
        </div>`;

const newUI = `        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-[14px] font-semibold text-ink-soft mb-2">
              اسم الدواء (التجاري)
            </label>
            <div className="bg-card border-2 border-mint-line rounded-xl p-3.5">
              <input
                required
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="مثال: أوجمنتين ١g"
                className="w-full bg-transparent border-none outline-none text-[16px] text-ink placeholder:text-[#A6B8AE]"
                dir="auto"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-[14px] font-semibold text-ink-soft mb-2">
              الاسم العلمي
            </label>
            <div className="bg-card border-2 border-mint-line rounded-xl p-3.5">
              <input
                name="scientificName"
                value={formData.scientificName}
                onChange={handleChange}
                placeholder="مثال: Amoxicillin"
                className="w-full bg-transparent border-none outline-none text-[16px] text-ink placeholder:text-[#A6B8AE]"
                dir="auto"
              />
            </div>
          </div>
        </div>`;

if (code.includes(targetUI)) {
  code = code.replace(targetUI, newUI);
  fs.writeFileSync('web/src/app/add-item/page.tsx', code, 'utf8');
  console.log("Patched add-item for scientificName");
} else {
  console.log("Could not find target string for UI patch");
}
