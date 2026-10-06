const fs = require('fs');

function patchAddItemOptions() {
  let code = fs.readFileSync('web/src/app/add-item/page.tsx', 'utf8');
  
  const oldOptions = `<option value="شريط">شريط</option>
                    <option value="أمبولة">أمبولة</option>
                    <option value="ظرف">ظرف</option>`;
                    
  const newOptions = `<option value="شريط">شريط</option>
                    <option value="حبة">حبة / كبسولة</option>
                    <option value="أمبولة">أمبولة</option>
                    <option value="ظرف">ظرف (مغلف)</option>
                    <option value="قطرة">قطرة</option>
                    <option value="عبوة">عبوة</option>`;
                    
  if (code.includes(oldOptions)) {
    code = code.replace(oldOptions, newOptions);
    fs.writeFileSync('web/src/app/add-item/page.tsx', code, 'utf8');
    console.log("Patched add-item options");
  } else {
    console.log("Failed to patch add-item options");
  }
}

function patchInventoryOptions() {
  let code = fs.readFileSync('web/src/app/inventory/page.tsx', 'utf8');
  
  const oldOptions = `<option value="شريط">شريط</option>
                            <option value="أمبولة">أمبولة</option>
                            <option value="مغلف">مغلف</option>
                            <option value="قطرة">قطرة</option>`;
                            
  const newOptions = `<option value="شريط">شريط</option>
                            <option value="حبة">حبة / كبسولة</option>
                            <option value="أمبولة">أمبولة</option>
                            <option value="ظرف">ظرف (مغلف)</option>
                            <option value="قطرة">قطرة</option>
                            <option value="عبوة">عبوة</option>`;
                            
  if (code.includes(oldOptions)) {
    code = code.replace(oldOptions, newOptions);
    fs.writeFileSync('web/src/app/inventory/page.tsx', code, 'utf8');
    console.log("Patched inventory options");
  } else {
    console.log("Failed to patch inventory options");
  }
}

patchAddItemOptions();
patchInventoryOptions();
