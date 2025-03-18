import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertSchools1742294768970 implements MigrationInterface {
  name = 'InsertSchools1742294768970';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO \`school\` (id, nameEn, nameAr, imageKey) VALUES
      (1, 'Al-Alson International School (ALS)', 'مدارس الالسن للغات', 'd8d97c-b130-42d6-950a-91942b2ab81e.jpg'),
      (2, 'The American school of Egypt (ASE)', 'المدرسة الامريكية في مصر', '02e9280e-758d-4d6f-823e-0491a0721876.png'),
      (3, 'Belvedere School Cairo', 'مدرسة البلفدير بالقاهرة', '143919ed-e883-4601-8618-fb00742d46d5.jpg'),
      (4, 'British International College of Cairo (BICC)', 'الكلية البريطانية الدولية بالقاهرة', '042bc185-7b41-4b12-bf6f-acceef200c5f.jpg'),
      (5, 'Brilliance International School', 'مدرسة بريليانس الدولية', 'e064332a-bbce-4c00-94ad-dd32a3c84d3c.jpg'),
      (6, 'The British International School Madinaty (BISM)', 'المدرسة البريطانية الدولية بمدينتي', '147b54a5-60c1-4c75-b56e-8f371b7da547.png'),
      (7, 'British Ramses School (BRS)', 'مدرسة رمسيس البريطانية', '726aa97b-c45e-45ee-be6e-8f4338e07325.jpg'),
      (8, 'The British School of Egypt (BSE)', 'المدرسة البريطانية في مصر', 'b1d22d47-68f7-4420-8754-442fd34c383d.jpg'),
      (9, 'British School of Elite Education (BSEE)', 'مدرسة ايليت البريطانية', 'a500836a-9811-4958-a213-6437759859ab.jpg'),
      (10, 'Capital International Schools', 'مدارس كابيتال الدولية', 'a792627f-4ab9-4b6f-9a2f-70f0f151caef.png'),
      (11, 'The International School of Choueifat October', 'مدارس الشويفات الدولية أكتوبر', '5bc3ecab-4c83-4822-a24f-94245447ae75.jpg'),
      (12, 'Dome International School', 'مدرسة دوم الدولية', '948d646a-46bc-4f96-aaa1-903f3164c63b.png'),
      (13, 'Egypt British International School (EBIS)', 'مدرسة مصر البريطانية الدولية', '65aa624b-c691-439e-82fa-f6ad6ee6fe55.jpg'),
      (14, 'École Oasis Internationale', 'مدرسة واحة المعادي الدولية', 'dbfbb770-5f7c-4064-a7bf-51721c935e6e.jpg'),
      (15, 'Europa Schule Kairo', 'المدرسة الأوروبية بالقاهرة', '6d82095d-8fa4-43a8-a526-fa99a48e6809.jpg'),
      (16, 'Gateway International Montessori School', 'مدرسة جيت واى مونتيسوري الدولية', 'd85648d2-5472-417d-923b-04edda14a9d7.jpg'),
      (17, 'GEMS International School Cairo (GISC)', 'مدرسة جيمس الدولية', 'b8b969a8-81d9-425c-9577-c0e10b77ec13.jpg'),
      (18, 'Gheriany International Schools (GIS)', 'مدارس غرياني الدولية', 'e85b44d8-6ad7-418d-8a88-9a2105b2e8c3.jpg'),
      (19, 'Green Land International School Sheikh Zayed (GPIS)', 'مدرسة جرين لاند الدولية الشيخ زايد', '29f3ec01-9936-40a0-bd3d-ceda1b603f45.jpg'),
      (20, 'Greek Catholic Patriarchal College', 'المدرسة البطريركية', NULL),
      (21, 'Heritage International School', 'مدرسة التراث الدولية', 'db3ee154-7e44-4541-8a63-13ce2ae8d22a.jpg'),
      (22, 'Highlands School Of Egypt (HSE)', 'مدرسة هاي لاند الدولية', '1a19f345-4811-41a7-a339-d98a8367919c.jpg'),
      (23, 'Imperial College Egypt (ICE)', 'امبريال كوليدج مصر', 'b372e9cd-2e0d-4fc0-aaf7-c8630dcc2eff.jpg'),
      (24, 'The International School Of Egypt (ISE)', 'مدرسة مصر الدولية', '9e4cb35d-a6ff-4992-8c5a-13a5d7f456d1.jpg'),
      (25, 'Leaders Language School', 'مدرسة ليدرز للغات', '896458b6-6464-432d-9935-c5c1e44c80c3.png'),
      (26, 'Maadi Narmer School', 'مدرسة نارمر المعادي', 'ec2e7765-c110-4b3e-b6c2-e30da85d15f3.png'),
      (27, 'Misr American College (MAC)', 'الكلية المصرية الامريكية', 'd6a86c64-1047-4106-957a-8594dde986a4.png'),
      (28, 'Malvern College Egypt (MCE)', 'مدرسة مالفيرن كولدج', '8387a4ec-0ed2-4295-acd8-b130490d073d.png'),
      (29, 'Merryland International School', 'مدرسة ميريلاند الدولية', '7e1f9e1a-d06f-4217-85b5-2446a9cf2030.png'),
      (30, 'Modern Education Schools (MES)', 'مدارس التربية الحديثة', '47fb47c4-6fd2-4f66-9245-6ee2af8861cc.jpg'),
      (31, 'Modern English School Cairo (MES)', 'المدرسة الانجليزية الحديثة بالقاهرة', '5a729868-4f97-40ae-a016-201c8c46bf6d.png'),
      (32, 'Metropolitan School', 'مدرسة متروبوليتان', 'f11a86f4-6568-473d-857f-78a6ff01faea.jpg'),
      (33, 'British International Modern School (BIMS)', 'المدرسة البريطانية الدولية الحديثة', '7af98eab-3d80-4327-9118-9af5b64ff673.png'),
      (34, 'Mount International School Community (MISC)', 'مدرسة مجتمع ماونت الدولية', '7c493917-b8d6-4e46-a598-c11fa3f3f042.png'),
      (35, 'Nefertari International School (NIS)', 'مدرسة نفرتاري الدولية', 'adadbe9e-666a-4b43-91e0-058d81ce567e.jpg'),
      (36, 'New Generation International Schools', 'مدارس الجيل الجديد الدولية', '9ba407fa-a6cc-4acd-9ea9-85931dab348f.jpg'),
      (37, 'New Ramses College (NRC)', 'مدرسة كلية رمسيس الجديدة', '512bc1e9-9ccc-4075-af4f-c31dd24fcac0.png'),
      (38, 'Rahn Schulen Kairo', 'مدرسة ران بالقاهرة', '9c5b3767-a43e-44b4-8b52-62bc212b9743.png'),
      (39, 'Roots School', 'مدرسة روتس للغات', '91895637-f3ee-4cb5-8a28-f6d78c362219.png'),
      (40, 'Sahara International School', 'مدرسة صحارا الدولية', '227ab80b-2cee-4715-a38c-8778ab85c929.jpg'),
      (41, 'Saint Fatima Language School', 'مدرسة سانت فاتيما للغات', 'c09a51d4-2434-486f-a492-4de0c72bd22b.jpg'),
      (42, 'Scholars International Language School (SILS)', 'مدرسة سكولرز الدولية للغات', 'd0680ef0-8a56-4689-b2e0-91be2e93e74f.jpg'),
      (43, 'Smart Village Schools (SVS) - Lycée Voltaire', 'مدارس القرية الذكية', '4910d13a-7326-4f7f-8086-40708f61f351.png'),
      (44, 'Smart Village Schools (SVS) - Kipling School', 'مدارس القرية الذكية', '621e58cc-ecb1-4ba8-bf3c-cb5c513ff3da.png'),
      (45, 'The British School Al Rehab (TBS)', 'المدرسة البريطانية الرحاب', 'c8ab02aa-13fc-4b0b-aa80-d49d995455eb.png'),
      (46, 'Trillium Nursery', 'تريليام نيرسيري', '8e8c53cb-56d6-4a02-9ff6-5048fb2ebe2a.jpeg'),
      (47, 'Westview International Language School (WILS)', 'مدرسة ويست فيو الدولية للغات', '4830b765-538d-4050-b285-f66b651dc556.png'),
      (48, 'Windrose Academy', 'ويندروز اكاديمي', 'f3d56e01-b46e-45ae-94ef-033c5d71c9d6.png');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM \`school\`
      WHERE id BETWEEN 1 AND 48;
    `);
  }
}
