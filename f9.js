const fs = require('fs');
let code = fs.readFileSync('C:/roshetta_app/src/screens/pos/ReturnsScreen.js', 'utf8');

const targetJsx = \              </View>
              {/* Found Sale / Items */}
              {foundSale && (\;

const newJsx = \              </View>

              {/* Show Recent Invoices if none selected */}
              {!foundSale && sales && sales.length > 0 && (
                <View style={[styles.card, { marginTop: 16 }]}>
                  <Text style={[styles.sectionLabel, { textAlign: isRtl ? 'right' : 'left', marginBottom: 16 }]}>
                    {t('recent_invoices') || 'أحدث الفواتير'}
                  </Text>
                  {sales.slice(0, 5).map((s, i) => (
                    <TouchableOpacity 
                      key={i} 
                      style={[styles.itemRow, { flexDirection: isRtl ? 'row-reverse' : 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.bg }]}
                      onPress={() => {
                        setInvoiceQuery(String(s.id));
                        const items = typeof s.items === 'string' ? JSON.parse(s.items) : (s.items || []);
                        setFoundSale(s);
                        setReturnItems(items.map(it => ({ ...it, returnQty: 0 })));
                      }}
                    >
                      <View style={{ flexDirection: isRtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}>
                        <Feather name="file-text" size={20} color={colors.primary} />
                        <View>
                          <Text style={{ fontFamily: fonts.semiBold, color: colors.ink }}>
                            رقم الفاتورة: {s.id}
                          </Text>
                          {s.customer && s.customer.name && (
                            <Text style={{ fontFamily: fonts.medium, color: colors.inkSoft, fontSize: 12 }}>
                              {s.customer.name}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View style={{ alignItems: isRtl ? 'flex-start' : 'flex-end' }}>
                         <Text style={{ fontFamily: fonts.bold, color: colors.teal }}>{s.total?.toFixed(2)} ₪</Text>
                         <Text style={{ fontFamily: fonts.medium, color: colors.inkLight, fontSize: 12 }}>{new Date(s.date).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Found Sale / Items */}
              {foundSale && (\;

code = code.replace(targetJsx, newJsx);
fs.writeFileSync('C:/roshetta_app/src/screens/pos/ReturnsScreen.js', code, 'utf8');
