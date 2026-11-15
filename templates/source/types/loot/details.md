@@include details/optional-passive-active-effects.md

@@include details/fields.md

### **Loot Types**
| Type | Description | Examples |
|------|-------------|----------|
| `art` | Artistic objects, paintings, sculptures | Paintings, tapestries, carvings |
| `gear` | Adventuring gear | Rope, rations, torches, a bedroll |
| `gem` | Precious stones | Diamonds, rubies, opals |
| `junk` | Worthless or near-worthless items | Broken tools, broken pottery, rusty nails |
| `material` | Crafting components | Monster parts, rare metals |
| `resource` | Consumable crafting resources | Ingots, lumber, cloth bolts |
| `trade` | Trade goods with mercantile value | Silk, spices, livestock |
| `treasure` | Coins, trade bars, valuables | Gold bars, ancient coins |

### **Common Gem Values (5e Standard)**
| Value | Examples |
|-------|----------|
| 10 gp | Azurite, banded agate, blue quartz, moss agate |
| 50 gp | Bloodstone, carnelian, jasper, moonstone, onyx |
| 100 gp | Amber, amethyst, garnet, jade, pearl, tourmaline |
| 500 gp | Alexandrite, aquamarine, black pearl, topaz |
| 1,000 gp | Black opal, blue sapphire, emerald, fire opal, ruby |
| 5,000 gp | Black sapphire, diamond, jacinth, star ruby |

### **Common Art Object Values (5e Standard)**
| Value | Examples |
|-------|----------|
| 25 gp | Silver ewer, carved bone statuette, small gold bracelet |
| 250 gp | Gold ring with bloodstones, carved ivory statuette |
| 750 gp | Silver chalice with moonstones, bronze crown |
| 2,500 gp | Gold dragon comb with red garnets, jeweled gold crown |
| 7,500 gp | Gold and ruby ring, gold music box, painting by master |

---

## **ENRICHER REFERENCE**

Loot items typically don't have mechanical effects, but enrichers can enhance descriptions and provide hooks for magical items or crafting materials.

### **Condition & Rule References**
```html
&Reference[blinded]                    → Blinded (with tooltip)
&Reference[poisoned]                   → Poisoned
&Reference[petrified]                  → Petrified
&Reference[Difficult Terrain]          → Difficult Terrain
```

### **Damage Types (for material descriptions)**
```html
&Reference[fire]                       → Fire damage type info
&Reference[cold]                       → Cold damage type info
&Reference[radiant]                    → Radiant damage type info
&Reference[necrotic]                   → Necrotic damage type info
```

### **Spell References (for crafting components)**
```html
<em>revivify</em>                      → Spell name in italics
<em>greater restoration</em>           → Spell name in italics
```

### **Dynamic Lookups**
```html
[[lookup @name]]                       → Creature's name (for story items)
[[lookup @details.type.config.label]]  → Creature type
```

---

@@include details/html-patterns.md

### **Standard Loot Description**
```html
<p><em>Brief flavor description of the item's appearance.</em></p>
```

### **Detailed Art Object**
```html
<p><em>A detailed description of the artwork's appearance and craftsmanship.</em></p>

<p><strong>Origin.</strong> This piece was created by [artist/culture] during [era/event].</p>

<p><strong>Provenance.</strong> [History of ownership or discovery].</p>
```

### **Crafting Material with Uses**
```html
<p><em>Physical description of the material.</em></p>
<hr>

<p><strong>Crafting Uses.</strong> This material can be used to craft or enhance items with the following properties:</p>
<ul>
<li>Property one</li>
<li>Property two</li>
</ul>

<p><strong>Harvesting.</strong> A creature can harvest this material with a successful [[/check nature 15 format=long]] or appropriate tool check.</p>
```

### **Magical Component**
```html
<p><em>Physical description.</em></p>
<hr>

<p><strong>Spell Component.</strong> This item can serve as the material component for the following spells:</p>
<ul>
<li><em>spell name</em> (consumed/not consumed)</li>
</ul>
```

### **Story Hook Item**
```html
<p><em>Physical description.</em></p>
<hr>

<p><strong>Inscription.</strong> The item bears the following text: <em>"Quoted inscription here."</em></p>

<p><strong>History.</strong> A successful [[/check history 15 format=long]] reveals [historical information].</p>
```

---


@@include details/explicit-fields.md
