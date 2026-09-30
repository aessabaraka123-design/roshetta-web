const fs = require('fs');
let code = fs.readFileSync('C:/roshetta_app/src/screens/pos/ReturnsScreen.js', 'utf8');

const oldCode = \    const selected = returnItems.filter(it => it.returnQty > 0);
    if (selected.length === 0) { showToast(t('str_b93xyj5')); return; }\;

const newCode = \    const selected = returnItems.filter(it => it.returnQty > 0);
    if (selected.length === 0) { showToast(t('str_b93xyj5')); return; }
    
    // Call the actual store action
    const itemsToRefund = selected.map(i => ({ id: i.id, qty: i.returnQty }));
    useStore.getState().refundSale(foundSale.id, itemsToRefund, totalRefund);
    
    // Attempt sync immediately if online
    const syncWithServer = useStore.getState().syncWithServer;
    if (syncWithServer) syncWithServer();\;

code = code.replace(oldCode, newCode);
fs.writeFileSync('C:/roshetta_app/src/screens/pos/ReturnsScreen.js', code, 'utf8');
