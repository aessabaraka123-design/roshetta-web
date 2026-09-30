const fs = require('fs');
let code = fs.readFileSync('C:/roshetta_app/src/store/index.js', 'utf8');

const target = \          set({
            inventory: [
              ...pendingInventory,
              ...(invRes.status === "fulfilled" && invRes.value?.success
                ? invRes.value.inventory
                : []),
            ],
            sales: [
              ...pendingSales,
              ...(salesRes.status === "fulfilled" && salesRes.value?.success
                ? salesRes.value.sales
                : []),
            ],
            branches:
              branchRes.status === "fulfilled" && branchRes.value?.success
                ? branchRes.value.branches
                : [],
            staff:
              staffRes.status === "fulfilled" && staffRes.value?.success
                ? staffRes.value.staff
                : [],
            patients: [
              ...pendingPatients,
              ...(custRes.status === "fulfilled" && custRes.value?.success
                ? custRes.value.customers
                : []),
            ],
            expenses:
              expRes.status === "fulfilled" && expRes.value?.success
                ? expRes.value.expenses
                : [],
            suppliers:
              suppRes?.status === "fulfilled" && suppRes.value?.success
                ? suppRes.value.suppliers
                : [],
            purchases:
              purchRes?.status === "fulfilled" && purchRes.value?.success
                ? purchRes.value.purchases || []
                : [],\;

const replacement = \          const current = get();
          set({
            inventory: invRes.status === "fulfilled" && invRes.value?.success
              ? [...pendingInventory, ...invRes.value.inventory]
              : current.inventory,
            sales: salesRes.status === "fulfilled" && salesRes.value?.success
              ? [...pendingSales, ...salesRes.value.sales]
              : current.sales,
            branches: branchRes.status === "fulfilled" && branchRes.value?.success
              ? branchRes.value.branches
              : current.branches,
            staff: staffRes.status === "fulfilled" && staffRes.value?.success
              ? staffRes.value.staff
              : current.staff,
            patients: custRes.status === "fulfilled" && custRes.value?.success
              ? [...pendingPatients, ...custRes.value.customers]
              : current.patients,
            expenses: expRes.status === "fulfilled" && expRes.value?.success
              ? expRes.value.expenses
              : current.expenses,
            suppliers: suppRes?.status === "fulfilled" && suppRes.value?.success
              ? suppRes.value.suppliers
              : current.suppliers,
            purchases: purchRes?.status === "fulfilled" && purchRes.value?.success
              ? purchRes.value.purchases || []
              : current.purchases,\;

code = code.replace(target, replacement);
fs.writeFileSync('C:/roshetta_app/src/store/index.js', code, 'utf8');
