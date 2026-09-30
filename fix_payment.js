const fs = require('fs');
const file = 'C:/roshetta_app/src/screens/auth/PaymentScreen.js';
let code = fs.readFileSync(file, 'utf8');

// For PalPay
code = code.replace(
  /<Feather name="copy" size=\{18\} color="#1D4ED8" \/>\s*<\/TouchableOpacity>\s*<\/View>\s*<\/View>/g,
  '<Feather name="copy" size={18} color="#1D4ED8" />\n              </TouchableOpacity>\n            </View>\n            <Text style={styles.companyNameText}>\n              {settings?.companyName || "روشتة للبرمجيات"}\n            </Text>\n          </View>'
);

// For Jawwal Pay
code = code.replace(
  /<Feather name="copy" size=\{18\} color="#047857" \/>\s*<\/TouchableOpacity>\s*<\/View>\s*<\/View>/g,
  '<Feather name="copy" size={18} color="#047857" />\n              </TouchableOpacity>\n            </View>\n            <Text style={styles.companyNameText}>\n              {settings?.companyName || "روشتة للبرمجيات"}\n            </Text>\n          </View>'
);

fs.writeFileSync(file, code, 'utf8');
