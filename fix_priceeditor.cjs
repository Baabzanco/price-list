const fs = require('fs');
const content = fs.readFileSync('src/pages/admin/PriceEditor.tsx', 'utf8');

const targetStr = `                      return (
                        <tr key={product.id} className="hover:bg-surface-50/30 dark:hover:bg-surface-800/30">
                          <td className="px-6 py-3 font-medium text-surface-900 dark:text-white">{product.name}</td>
                          
                          {category.hasLamb && (
                            <td className="px-6 py-3">`;

const replacement = `                      return (
                        <tr key={product.id} className="hover:bg-surface-50/30 dark:hover:bg-surface-800/30">
                          <td className="px-6 py-3 font-medium text-surface-900 dark:text-white">{product.name}</td>
                          
                          {!product.hasLamb && !product.hasTwoTeeth ? (
                            <td colSpan={category.hasLamb && category.hasTwoTeeth ? 2 : 1} className="px-6 py-3">
                              <div className="relative w-48 mx-auto">
                                <input
                                  type="text"
                                  value={editState.priceLamb === null ? '' : editState.priceLamb}
                                  onChange={(e) => handlePriceChange(product.id, 'priceLamb', e.target.value)}
                                  className={cn(
                                    "w-full px-3 py-2 rounded-lg border text-left font-sans focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all dark:bg-surface-800 dark:text-white",
                                    lambChanged ? "border-secondary dark:border-secondary bg-secondary/5 dark:bg-secondary/20 text-secondary dark:text-secondary font-bold" : "border-surface-200 dark:border-surface-700 bg-white"
                                  )}
                                  placeholder="قیمت واحد"
                                  dir="ltr"
                                />
                                {lambChanged && (
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-secondary dark:text-secondary">
                                    تغییر کرده
                                  </span>
                                )}
                              </div>
                            </td>
                          ) : (
                            <>
                              {category.hasLamb && (
                                <td className="px-6 py-3">
                                  <div className="relative w-48">
                                    <input
                                      type="text"
                                      value={editState.priceLamb === null ? '' : editState.priceLamb}
                                      onChange={(e) => handlePriceChange(product.id, 'priceLamb', e.target.value)}
                                      className={cn(
                                        "w-full px-3 py-2 rounded-lg border text-left font-sans focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all dark:bg-surface-800 dark:text-white",
                                        lambChanged ? "border-secondary dark:border-secondary bg-secondary/5 dark:bg-secondary/20 text-secondary dark:text-secondary font-bold" : "border-surface-200 dark:border-surface-700 bg-white"
                                      )}
                                      placeholder="—"
                                      dir="ltr"
                                    />
                                    {lambChanged && (
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-secondary dark:text-secondary">
                                        تغییر کرده
                                      </span>
                                    )}
                                  </div>
                                </td>
                              )}

                              {category.hasTwoTeeth && (
                                <td className="px-6 py-3">
                                  <div className="relative w-48">
                                    <input
                                      type="text"
                                      value={editState.priceTwoTeeth === null ? '' : editState.priceTwoTeeth}
                                      onChange={(e) => handlePriceChange(product.id, 'priceTwoTeeth', e.target.value)}
                                      className={cn(
                                        "w-full px-3 py-2 rounded-lg border text-left font-sans focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all dark:bg-surface-800 dark:text-white",
                                        twoTeethChanged ? "border-secondary dark:border-secondary bg-secondary/5 dark:bg-secondary/20 text-secondary dark:text-secondary font-bold" : "border-surface-200 dark:border-surface-700 bg-white"
                                      )}
                                      placeholder="—"
                                      dir="ltr"
                                    />
                                    {twoTeethChanged && (
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-secondary dark:text-secondary">
                                        تغییر کرده
                                      </span>
                                    )}
                                  </div>
                                </td>
                              )}
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );`;

const oldFullRegex = /return \([\s\S]*?<tr key=\{product\.id\}.*?className="hover:bg-surface-50\/30 dark:hover:bg-surface-800\/30">[\s\S]*?\{category\.hasLamb && \([\s\S]*?<\/td>[\s\S]*?\)\]?\}[\s\S]*?\{category\.hasTwoTeeth && \([\s\S]*?<\/td>[\s\S]*?\)\]?\}[\s\S]*?<\/tr>[\s\S]*?\);[\s\S]*?\}\)\]?\}[\s\S]*?<\/tbody>[\s\S]*?<\/table>[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?\);/;

fs.writeFileSync('src/pages/admin/PriceEditor.tsx', content.replace(oldFullRegex, replacement));
