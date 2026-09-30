const fs = require('fs');
let code = fs.readFileSync('C:/roshetta_app/src/screens/pos/ReturnsScreen.js', 'utf8');

// Fix recent_invoices translation
code = code.replace("{t('recent_invoices') || 'أحدث الفواتير'}", "{t('recent_invoices') === 'recent_invoices' ? 'أحدث الفواتير' : t('recent_invoices')}");

// Make the list dynamic based on query, and remove foundSale auto-selection
const target = \              {!foundSale && sales && sales.length > 0 && (
                <View style={[styles.card, { marginTop: 16 }]}>
                  <Text style={[styles.sectionLabel, { textAlign: isRtl ? 'right' : 'left', marginBottom: 16 }]}>
                    {t('recent_invoices') === 'recent_invoices' ? 'أحدث الفواتير' : t('recent_invoices')}
                  </Text>
                  {sales.slice(0, 5).map((s, i) => (\;

const newTarget = \              {!foundSale && sales && sales.length > 0 && (
                <View style={[styles.card, { marginTop: 16 }]}>
                  <Text style={[styles.sectionLabel, { textAlign: isRtl ? 'right' : 'left', marginBottom: 16 }]}>
                    {invoiceQuery.trim() ? (t('search_results') === 'search_results' ? 'نتائج البحث' : t('search_results')) : (t('recent_invoices') === 'recent_invoices' ? 'أحدث الفواتير' : t('recent_invoices'))}
                  </Text>
                  {sales.filter(s => {
                    const q = invoiceQuery.trim().toLowerCase();
                    if (!q) return true;
                    return String(s.id).toLowerCase().includes(q) || (s.customer && s.customer.name && s.customer.name.toLowerCase().includes(q));
                  }).slice(0, 8).map((s, i) => (\;

code = code.replace(target, newTarget);
fs.writeFileSync('C:/roshetta_app/src/screens/pos/ReturnsScreen.js', code, 'utf8');
