const fs = require('fs');
let code = fs.readFileSync('C:/roshetta_app/src/screens/pos/POSScreen.js', 'utf8');

// Fix 1: AddToCart normal
code = code.replace(
  'newCart[exIndex].cartQty += 1;',
  'newCart[exIndex] = { ...newCart[exIndex], cartQty: newCart[exIndex].cartQty + 1 };'
);

// Fix 2: AddToCart new line
code = code.replace(
  'newCart[exIndexNew].cartQty += 1;',
  'newCart[exIndexNew] = { ...newCart[exIndexNew], cartQty: newCart[exIndexNew].cartQty + 1 };'
);

// Fix 3: AddToCart old line split
code = code.replace(
  'newCart[exIndex].cartQty = Math.ceil(qtyAtOldPrice / requiredBaseUnits);',
  'newCart[exIndex] = { ...newCart[exIndex], cartQty: Math.ceil(qtyAtOldPrice / requiredBaseUnits) };'
);

// Fix 4: AddToCart new line split
code = code.replace(
  'newCart[exIndexNew].cartQty = Math.ceil(qtyAtNewPrice / requiredBaseUnits);',
  'newCart[exIndexNew] = { ...newCart[exIndexNew], cartQty: Math.ceil(qtyAtNewPrice / requiredBaseUnits) };'
);

// Fix 5: changeQty decrease
code = code.replace(
  'cartItem.cartQty += delta;',
  'newCart[index] = { ...cartItem, cartQty: cartItem.cartQty + delta };\n    const updatedCartItem = newCart[index];'
);
code = code.replace(
  'if (cartItem.cartQty < 1) {',
  'if (updatedCartItem.cartQty < 1) {'
);

fs.writeFileSync('C:/roshetta_app/src/screens/pos/POSScreen.js', code, 'utf8');
