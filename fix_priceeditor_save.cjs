const fs = require('fs');
const content = fs.readFileSync('src/pages/admin/PriceEditor.tsx', 'utf8');

const saveRegex = /const handleSave = async \(\) => \{[\s\S]*?catch \(error\) \{/m;

const newSave = `const handleSave = async () => {
    try {
      if (!user) throw new Error('Not authenticated');
      
      const changedProducts = Object.keys(edits).filter(id => {
        const product = products.find(p => p.id === id);
        if (!product) return false;
        return edits[id].priceLamb !== product.priceLamb || edits[id].priceTwoTeeth !== product.priceTwoTeeth;
      });

      const updates = changedProducts.map(id => ({
        id,
        priceLamb: edits[id].priceLamb,
        priceTwoTeeth: edits[id].priceTwoTeeth
      }));

      if (updates.length > 0) {
        await db.updateProductPrices(updates, user.id);
      }
      
      await db.updateSettings({ lastUpdated: new Date().toISOString() });
      
      setToast({ type: 'success', message: 'قیمت‌ها با موفقیت ذخیره شدند.' });
      setTimeout(() => setToast(null), 3000);
    } catch (error) {`;

fs.writeFileSync('src/pages/admin/PriceEditor.tsx', content.replace(saveRegex, newSave));
