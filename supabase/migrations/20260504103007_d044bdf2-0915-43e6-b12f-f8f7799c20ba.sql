-- Wipe transactional + reference data
TRUNCATE TABLE sales_items, sales_transactions, markdown_events, inventory_batches, purchase_order_lines, purchase_orders RESTART IDENTITY CASCADE;
DELETE FROM audit_log WHERE entity_type IN ('product','purchase_order','inventory_batch','markdown_event','approval_rule','supplier');
TRUNCATE TABLE products RESTART IDENTITY CASCADE;
TRUNCATE TABLE suppliers RESTART IDENTITY CASCADE;
TRUNCATE TABLE stores RESTART IDENTITY CASCADE;
TRUNCATE TABLE categories RESTART IDENTITY CASCADE;

-- Categories
INSERT INTO categories (id, name) VALUES
 ('645f1e11-63b9-4bc2-b65c-f9ea86e91104', 'Dairy & Cheese — الألبان والأجبان'),
 ('a3a30ce5-abc1-4db5-b854-31544ed4b1d1', 'Bakery & Bread — المخبوزات'),
 ('ec2a4636-99f5-4056-9768-c999b625620c', 'Fresh Meat — اللحوم الطازجة'),
 ('33170faa-8aec-4b76-8d1c-73d457096c70', 'Produce — الخضار والفاكهة'),
 ('053058f5-f53d-42e6-bbb6-1edaece698b1', 'Beverages — المشروبات'),
 ('de60b027-fc3f-440f-8e60-b6d1bc26121a', 'Frozen Foods — المجمدات'),
 ('2136b71b-c309-4ac7-acf7-87d527e77df3', 'Spices & Grains — التوابل والحبوب'),
 ('ae46825d-ad89-4afa-acbf-55531bb83e96', 'Sweets & Dates — الحلويات والتمور');

-- Stores
INSERT INTO stores (id, store_code, name, location) VALUES
 ('fe33054e-be4b-4a48-982c-d16d7d635e0d','ST-RYD','Riyadh Flagship — الرياض','King Fahd Rd, Riyadh'),
 ('a75385ec-e857-48df-8d51-8c7dba382d5f','ST-JED','Jeddah Corniche — جدة','Corniche Rd, Jeddah'),
 ('aa4ec00f-1013-4f34-b46a-92018ace2e1f','ST-DXB','Dubai Marina — دبي','Marina Walk, Dubai'),
 ('2019750f-abbc-40c0-b5de-730d68987b3e','ST-CAI','Cairo Heliopolis — القاهرة','Heliopolis, Cairo'),
 ('35d38212-3b31-4b99-82f6-54d01af429fd','ST-AMM','Amman Abdoun — عمّان','Abdoun, Amman');

-- Suppliers
INSERT INTO suppliers (id, name, contact_email, contact_phone) VALUES
 ('03fdf709-dbf4-4879-8b97-2766a8261dbe','Al-Marai Dairy Co. — المراعي','procurement@almarai.example','+966-11-2820000'),
 ('647dc62a-1aeb-4a15-9493-9d12b6d278d3','Almarai Bakery — مخابز المراعي','orders@almaraibakery.example','+966-12-6500000'),
 ('a1da3e90-e4e4-4545-bdea-c469831a2972','Tanmiah Fresh Meats — التنمية','sales@tanmiah.example','+966-13-8120000'),
 ('d9fff428-d64f-4797-945c-85fb4ff04c24','Al-Kabeer Frozen Foods — الكبير','b2b@alkabeer.example','+971-4-2828000'),
 ('112a12f9-562f-4067-99cf-4bea8498c718','Aujan Beverages — عوجان','procure@aujan.example','+966-13-8470000'),
 ('b1ae598b-3ff8-45d1-8ee4-36e55245c4c6','Bayara Spices — بيارة','sales@bayara.example','+971-4-3470000'),
 ('d3baaead-5f1a-42a4-ae54-4e1750847709','Bateel Dates — بتيل','wholesale@bateel.example','+966-11-4760000'),
 ('c01cc5d1-52cd-49f2-b464-a6fa61dad8ce','Sadia Halal Poultry — صديا','exports@sadia.example','+55-11-3411000'),
 ('bac64103-eaae-4b72-85db-dfb68edda637','Nabil Foods — نبيل','sales@nabilfoods.example','+962-6-4770000'),
 ('56b17903-5129-47c2-b81b-0ee479d04710','Halwani Bros. — حلواني','b2b@halwani.example','+966-12-6390000');

-- Products
INSERT INTO products (id, sku, name, category_id, primary_supplier_id, unit_cost, default_sales_price, current_sales_price, expiry_trackable, shelf_life_days, sell_by_days, active, valuation_method) VALUES
 ('f0cbd577-b549-4f58-a5bf-fc7f5a9ad8b0','DRY-001','Laban Up Drink — لبن آب 200ml','645f1e11-63b9-4bc2-b65c-f9ea86e91104','03fdf709-dbf4-4879-8b97-2766a8261dbe',1.2,2.5,2.5,true,21,3,true,'FIFO'),
 ('874f4077-ef7d-483d-a959-3daf4b1a1597','DRY-002','Halloumi Cheese — جبن حلوم 250g','645f1e11-63b9-4bc2-b65c-f9ea86e91104','03fdf709-dbf4-4879-8b97-2766a8261dbe',4.8,8.95,8.95,true,30,5,true,'FIFO'),
 ('f7723fff-acc5-4d17-a1c4-7a9f11afa097','DRY-003','Labneh Tub — لبنة 500g','645f1e11-63b9-4bc2-b65c-f9ea86e91104','03fdf709-dbf4-4879-8b97-2766a8261dbe',2.1,4.5,4.5,true,21,3,true,'FIFO'),
 ('1f15f55f-4f65-40c8-9339-27b48a4ff201','DRY-004','Feta Cheese — جبن فيتا 400g','645f1e11-63b9-4bc2-b65c-f9ea86e91104','03fdf709-dbf4-4879-8b97-2766a8261dbe',3.4,6.25,6.25,true,40,5,true,'FIFO'),
 ('646d3b2d-f4d3-456d-8c95-2045025a1578','DRY-005','Laban Drink — لبن رايب 1L','645f1e11-63b9-4bc2-b65c-f9ea86e91104','03fdf709-dbf4-4879-8b97-2766a8261dbe',1.8,3.4,3.4,true,14,2,true,'FIFO'),
 ('8c5c00fa-0257-47a2-ac0f-9447575973e7','BAK-001','Arabic Bread — خبز عربي (5pk)','a3a30ce5-abc1-4db5-b854-31544ed4b1d1','647dc62a-1aeb-4a15-9493-9d12b6d278d3',0.8,1.95,1.95,true,5,1,true,'FIFO'),
 ('247d7d9a-230d-4be4-aa95-636ce6386219','BAK-002','Saj Bread — خبز صاج','a3a30ce5-abc1-4db5-b854-31544ed4b1d1','647dc62a-1aeb-4a15-9493-9d12b6d278d3',0.95,2.25,2.25,true,5,1,true,'FIFO'),
 ('aa3af635-21e6-40bf-bc29-edcf3af097ba','BAK-003','Manakish Zaatar — مناقيش زعتر','a3a30ce5-abc1-4db5-b854-31544ed4b1d1','647dc62a-1aeb-4a15-9493-9d12b6d278d3',1.5,3.5,3.5,true,3,1,true,'FIFO'),
 ('154b1043-2683-4016-a89a-a74003ab84c5','BAK-004','Croissant 4pk — كرواسون','a3a30ce5-abc1-4db5-b854-31544ed4b1d1','647dc62a-1aeb-4a15-9493-9d12b6d278d3',2.2,4.95,4.95,true,5,1,true,'FIFO'),
 ('cdb86d79-ca80-45ea-94fb-c7180266ed36','MEA-001','Lamb Cuts — لحم ضأن 1kg','ec2a4636-99f5-4056-9768-c999b625620c','a1da3e90-e4e4-4545-bdea-c469831a2972',18.5,29.95,29.95,true,7,2,true,'FIFO'),
 ('54ea0acd-d896-4b07-8bd7-7c3f9ef7a516','MEA-002','Beef Kofta — كفتة 500g','ec2a4636-99f5-4056-9768-c999b625620c','a1da3e90-e4e4-4545-bdea-c469831a2972',6.8,12.5,12.5,true,5,1,true,'FIFO'),
 ('0662db15-d7fd-433e-a72c-2f0cd6013748','MEA-003','Chicken Shawarma — شاورما 1kg','ec2a4636-99f5-4056-9768-c999b625620c','c01cc5d1-52cd-49f2-b464-a6fa61dad8ce',7.2,13.95,13.95,true,4,1,true,'FIFO'),
 ('4e9f1858-c2bf-4c80-b2c0-73ae3d14ea61','MEA-004','Whole Chicken — دجاج كامل','ec2a4636-99f5-4056-9768-c999b625620c','c01cc5d1-52cd-49f2-b464-a6fa61dad8ce',5.4,9.95,9.95,true,7,2,true,'FIFO'),
 ('cbe871f0-17b2-4d86-bff6-6a8e47cda34e','PRD-001','Dates Khudri 1kg — تمر خضري','ae46825d-ad89-4afa-acbf-55531bb83e96','d3baaead-5f1a-42a4-ae54-4e1750847709',6.5,12.95,12.95,true,180,30,true,'FIFO'),
 ('0514bc0b-09e6-40e2-a7d8-94c7abcf6c0d','PRD-002','Dates Sukkari 1kg — تمر سكري','ae46825d-ad89-4afa-acbf-55531bb83e96','d3baaead-5f1a-42a4-ae54-4e1750847709',9.2,18.95,18.95,true,180,30,true,'FIFO'),
 ('381493ed-2871-4edb-bbe8-8905389632bb','PRD-003','Maamoul Cookies 500g — معمول','ae46825d-ad89-4afa-acbf-55531bb83e96','56b17903-5129-47c2-b81b-0ee479d04710',4.8,9.5,9.5,true,90,14,true,'FIFO'),
 ('efd13071-f08e-4d54-943b-1c9b52058a07','PRD-004','Halawa Tahini 500g — حلاوة طحينية','ae46825d-ad89-4afa-acbf-55531bb83e96','56b17903-5129-47c2-b81b-0ee479d04710',3.2,6.5,6.5,true,180,30,true,'FIFO'),
 ('22b94dd9-ad07-4ff5-97f7-a365532dc33a','BVG-001','Vimto Concentrate — فيمتو 710ml','053058f5-f53d-42e6-bbb6-1edaece698b1','112a12f9-562f-4067-99cf-4bea8498c718',4.2,7.95,7.95,false,365,NULL,true,'FIFO'),
 ('8ada3b2f-b67e-423c-bc55-2ca1e2134de2','BVG-002','Rani Mango Float 240ml — راني','053058f5-f53d-42e6-bbb6-1edaece698b1','112a12f9-562f-4067-99cf-4bea8498c718',0.65,1.5,1.5,true,180,30,true,'FIFO'),
 ('8846f59d-e448-4bf6-8f24-aaef1628e3ad','BVG-003','Karak Tea Mix 200g — شاي كرك','053058f5-f53d-42e6-bbb6-1edaece698b1','112a12f9-562f-4067-99cf-4bea8498c718',2.8,5.5,5.5,false,540,NULL,true,'FIFO'),
 ('2ec7e7b6-562c-4d1f-8dcf-5941f625def5','BVG-004','Arabic Coffee 500g — قهوة عربية','053058f5-f53d-42e6-bbb6-1edaece698b1','112a12f9-562f-4067-99cf-4bea8498c718',6.5,12.95,12.95,false,365,NULL,true,'FIFO'),
 ('f4e0edd6-92f1-4e8e-b5df-a37e1edad4f7','FRZ-001','Frozen Sambousek — سمبوسك مجمد','de60b027-fc3f-440f-8e60-b6d1bc26121a','d9fff428-d64f-4797-945c-85fb4ff04c24',4.5,8.95,8.95,true,180,30,true,'FIFO'),
 ('ee15c33a-6143-4a4e-8152-f5466fb2c758','FRZ-002','Frozen Kibbeh — كبة مجمدة','de60b027-fc3f-440f-8e60-b6d1bc26121a','d9fff428-d64f-4797-945c-85fb4ff04c24',5.2,10.5,10.5,true,180,30,true,'FIFO'),
 ('9f32c1f9-08b8-4e73-84c6-83e2018fa2d0','FRZ-003','Frozen Falafel — فلافل مجمد','de60b027-fc3f-440f-8e60-b6d1bc26121a','d9fff428-d64f-4797-945c-85fb4ff04c24',3.4,6.95,6.95,true,365,30,true,'FIFO'),
 ('4cff4dd9-b3f3-45fe-8959-f0c4a98384eb','SPC-001','Baharat Mix 200g — بهارات مشكلة','2136b71b-c309-4ac7-acf7-87d527e77df3','b1ae598b-3ff8-45d1-8ee4-36e55245c4c6',2.5,5.95,5.95,false,720,NULL,true,'FIFO'),
 ('1d94ac39-1440-42c5-82e8-51e5bf3b5a23','SPC-002','Saffron 5g — زعفران','2136b71b-c309-4ac7-acf7-87d527e77df3','b1ae598b-3ff8-45d1-8ee4-36e55245c4c6',18.0,29.95,29.95,false,720,NULL,true,'FIFO'),
 ('e8fb6a4e-1ab9-4835-80cf-e44b7ca2e402','SPC-003','Basmati Rice 5kg — أرز بسمتي','2136b71b-c309-4ac7-acf7-87d527e77df3','b1ae598b-3ff8-45d1-8ee4-36e55245c4c6',12.5,22.5,22.5,false,720,NULL,true,'FIFO'),
 ('1caa6d0d-95ef-464d-9b0c-ed72e1c174c8','SPC-004','Bulgur Wheat 1kg — برغل','2136b71b-c309-4ac7-acf7-87d527e77df3','bac64103-eaae-4b72-85db-dfb68edda637',2.2,4.5,4.5,false,540,NULL,true,'FIFO'),
 ('8ffffc7f-1e6d-411c-bb64-1e192a0a644a','PRO-001','Fresh Tomatoes 1kg — طماطم','33170faa-8aec-4b76-8d1c-73d457096c70','bac64103-eaae-4b72-85db-dfb68edda637',1.2,2.95,2.95,true,7,2,true,'FIFO'),
 ('ab28900b-1345-4512-88f8-e9ab2a33e2c2','PRO-002','Cucumbers 1kg — خيار','33170faa-8aec-4b76-8d1c-73d457096c70','bac64103-eaae-4b72-85db-dfb68edda637',1.1,2.5,2.5,true,7,2,true,'FIFO'),
 ('1996a1af-5be4-490c-9bd5-3ffaeb8e286c','PRO-003','Mint Bunch — نعناع','33170faa-8aec-4b76-8d1c-73d457096c70','bac64103-eaae-4b72-85db-dfb68edda637',0.4,1.25,1.25,true,4,1,true,'FIFO'),
 ('af9e709a-182d-49ef-aaf2-cf9b33ae2305','PRO-004','Lemons 1kg — ليمون','33170faa-8aec-4b76-8d1c-73d457096c70','bac64103-eaae-4b72-85db-dfb68edda637',1.5,3.25,3.25,true,14,3,true,'FIFO');

-- Approval rules
UPDATE approval_rules SET budget_allocated = 80000, budget_spent_mtd = 32400 WHERE department='Operations';
UPDATE approval_rules SET budget_allocated = 45000, budget_spent_mtd = 19800 WHERE department='Fresh Produce';
UPDATE approval_rules SET budget_allocated = 30000, budget_spent_mtd = 14250 WHERE department='Bakery';
UPDATE approval_rules SET budget_allocated = 60000, budget_spent_mtd = 8200 WHERE department='Pharmacy';