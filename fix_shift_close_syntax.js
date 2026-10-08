const fs = require('fs');
let server = fs.readFileSync('roshetta_server/server.js', 'utf8');

server = server.replace(
  `                db.run(
                  \`UPDATE shifts SET closing_amount = ?, expected_amount = ?, cash_sales = ?, card_sales = ?, status = 'closed', close_time = ?, notes = ? WHERE id = ?\`,
                  [
                    closing_amount,
                    expected_amount,
                    cash_sales,
                    card_sales,
                    close_time,
                    notes || "",
                    shiftId,
                  ],
                  function (err3) {
                    if (err3)
                      return res.status(500).json({
                        success: false,
                        error: err3.message,
                      });
                    res.json({
                      success: true,
                      cash_sales,
                      card_sales,
                      expected_amount,
                      closing_amount,
                    });
                  },
                );
              },
            );
          },
        );`,
  `                db.run(
                  \`UPDATE shifts SET closing_amount = ?, expected_amount = ?, cash_sales = ?, card_sales = ?, status = 'closed', close_time = ?, notes = ? WHERE id = ?\`,
                  [
                    closing_amount,
                    expected_amount,
                    cash_sales,
                    card_sales,
                    close_time,
                    notes || "",
                    shiftId,
                  ],
                  function (err3) {
                    if (err3)
                      return res.status(500).json({
                        success: false,
                        error: err3.message,
                      });
                    res.json({
                      success: true,
                      cash_sales,
                      card_sales,
                      expected_amount,
                      closing_amount,
                    });
                  },
                );
              }
            ); // end of expenses query
          },
        );`
);

fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
