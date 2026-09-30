const fs = require('fs');
let code = fs.readFileSync('C:/roshetta_app/src/screens/pos/POSScreen.js', 'utf8');

code = code.replace(
  'const [scannerVisible, setScannerVisible] = useState(false);',
  'const [scannerVisible, setScannerVisible] = useState(false);\n  const [confirmClearVisible, setConfirmClearVisible] = useState(false);'
);

const clearCartOld = \  const clearCart = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(t('confirm_empty_cart') || 'هل أنت متأكد من تفريغ السلة؟')) {
        setCart([]);
        setSelectedCustomer(null);
      }
    } else {
      Alert.alert(t('confirm'), t('confirm_empty_cart'), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('empty'), style: 'destructive', onPress: () => {
          setCart([]);
          setSelectedCustomer(null);
        }}
      ]);
    }
  };\;

const clearCartNew = \  const clearCart = () => {
    setConfirmClearVisible(true);
  };\;

code = code.replace(clearCartOld, clearCartNew);

const jsxTarget = \      {/* Floating Toasts - positioned above all content */}\;
const customModalJsx = \
      {/* Custom Clear Cart Confirmation Modal */}
      <Modal visible={confirmClearVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlayC}>
          <View style={[styles.unitModalContent, { padding: 20 }]}>
            <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Feather name="trash-2" size={24} color={colors.coral} />
            </View>
            <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: colors.ink, marginBottom: 8, textAlign: 'center' }}>
              {t('confirm')}
            </Text>
            <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.inkSoft, marginBottom: 24, textAlign: 'center' }}>
              {t('confirm_empty_cart') || 'هل أنت متأكد من تفريغ سلة المبيعات بالكامل؟'}
            </Text>
            
            <View style={[styles.rowDir, { width: '100%', gap: 12 }]}>
              <TouchableOpacity 
                style={{ flex: 1, paddingVertical: 12, backgroundColor: colors.bg, borderRadius: 12, alignItems: 'center' }}
                onPress={() => setConfirmClearVisible(false)}
              >
                <Text style={{ fontFamily: fonts.semiBold, color: colors.inkSoft }}>{t('cancel')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={{ flex: 1, paddingVertical: 12, backgroundColor: colors.coral, borderRadius: 12, alignItems: 'center' }}
                onPress={() => {
                  setCart([]);
                  setSelectedCustomer(null);
                  setConfirmClearVisible(false);
                }}
              >
                <Text style={{ fontFamily: fonts.bold, color: '#FFF' }}>{t('empty') || 'تفريغ'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Floating Toasts - positioned above all content */}\;

code = code.replace(jsxTarget, customModalJsx);
fs.writeFileSync('C:/roshetta_app/src/screens/pos/POSScreen.js', code, 'utf8');
