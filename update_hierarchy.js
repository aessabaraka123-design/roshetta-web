const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

// 1. Update cartTotal to use the hierarchical calculation
code = code.replace(
  `const cartTotal = cartItems.reduce((s, i) => s + i.qty * i.purchase_price, 0);`,
  `const cartTotal = cartItems.reduce((s, i) => {
    const strips = (i.qty || 0) * (i.strips_per_box || 1);
    return s + strips * (i.price_per_strip || i.purchase_price || 0);
  }, 0);`
);

// 2. Update addItemToCart to initialize hierarchy fields
code = code.replace(
  `const addItemToCart = (drug: any) => {
    const existing = cartItems.find(i => i.id === drug.id);
    if (existing) setCartItems(c => c.map(i => i.id === drug.id ? { ...i, qty: i.qty + 1 } : i));
    else setCartItems(c => [...c, { id: drug.id, name: drug.name, qty: 1, purchase_price: drug.cost || 0 }]);
    setItemSearch("");
    setShowDrop(false);
  };`,
  `const addItemToCart = (drug: any) => {
    const existing = cartItems.find(i => i.id === drug.id);
    if (existing) setCartItems(c => c.map(i => i.id === drug.id ? { ...i, qty: i.qty + 1 } : i));
    else setCartItems(c => [...c, {
      id: drug.id,
      name: drug.name,
      qty: 1,
      strips_per_box: 10,
      pills_per_strip: 10,
      price_per_strip: 0,
      price_per_pill: 0,
      purchase_price: 0,
      unit_size: 100, // strips_per_box * pills_per_strip
    }]);
    setItemSearch("");
    setShowDrop(false);
  };`
);

// 3. Update pullLowStock to also initialize hierarchy fields
code = code.replace(
  `newCart.push({ id: d.id, name: d.name, qty: needed, purchase_price: d.cost || 0 });`,
  `newCart.push({ id: d.id, name: d.name, qty: needed, strips_per_box: 10, pills_per_strip: 10, price_per_strip: 0, price_per_pill: 0, purchase_price: 0, unit_size: 100 });`
);

// 4. Update handleQuickAdd to also initialize hierarchy fields
code = code.replace(
  `setCartItems(c => [...c, { id: r.id, name: newItem.name, qty: 1, purchase_price: 0 }]);`,
  `setCartItems(c => [...c, { id: r.id, name: newItem.name, qty: 1, strips_per_box: 10, pills_per_strip: 10, price_per_strip: 0, price_per_pill: 0, purchase_price: 0, unit_size: 100 }]);`
);

// 5. Update handleSave to compute unit_size and effective values
code = code.replace(
  `body: JSON.stringify({ ...form, items: cartItems, total_cost: cartTotal, paid_amount: form.paid_amount ? parseFloat(form.paid_amount) : 0 })`,
  `body: JSON.stringify({
            ...form,
            items: cartItems.map(item => ({
              ...item,
              unit_size: (item.strips_per_box || 1) * (item.pills_per_strip || 1),
              purchase_price: item.price_per_strip || item.purchase_price || 0,
            })),
            total_cost: cartTotal,
            paid_amount: form.paid_amount ? parseFloat(form.paid_amount) : 0
          })`
);

fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
console.log('Updated cartTotal, addItemToCart, pullLowStock, handleSave');
