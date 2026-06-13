import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dataDir = path.join(__dirname, '..', 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = path.join(dataDir, 'homestay.db')

const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    zone TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('entire', 'room')),
    bedrooms INTEGER NOT NULL DEFAULT 1,
    max_guests INTEGER NOT NULL DEFAULT 2,
    base_guests INTEGER NOT NULL DEFAULT 2,
    base_price REAL NOT NULL,
    extra_guest_price REAL NOT NULL DEFAULT 0,
    amenities TEXT NOT NULL DEFAULT '[]',
    images TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'occupied', 'maintenance')),
    description TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES properties(id),
    guest_name TEXT NOT NULL,
    guest_phone TEXT NOT NULL,
    check_in TEXT NOT NULL,
    check_out TEXT NOT NULL,
    guests INTEGER NOT NULL DEFAULT 1,
    extra_services TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'checked_in', 'completed', 'cancelled')),
    total_amount REAL NOT NULL DEFAULT 0,
    penalty_amount REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS check_in_records (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id),
    property_id TEXT NOT NULL REFERENCES properties(id),
    guest_name TEXT NOT NULL,
    guest_phone TEXT NOT NULL,
    id_card TEXT NOT NULL DEFAULT '',
    check_in TEXT NOT NULL,
    check_out TEXT NOT NULL,
    actual_amount REAL NOT NULL DEFAULT 0,
    extra_services TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cleaning_tasks (
    id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES properties(id),
    scheduled_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed')),
    assignee TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS property_blackouts (
    id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES properties(id),
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    reason TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS extra_services_catalog (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    description TEXT NOT NULL DEFAULT ''
  );

  CREATE INDEX IF NOT EXISTS idx_orders_property_id ON orders(property_id);
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_orders_check_in ON orders(check_in);
  CREATE INDEX IF NOT EXISTS idx_check_in_records_order_id ON check_in_records(order_id);
  CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_property_id ON cleaning_tasks(property_id);
  CREATE INDEX IF NOT EXISTS idx_property_blackouts_property_id ON property_blackouts(property_id);
`)

const propertyCount = (db.prepare('SELECT COUNT(*) as count FROM properties').get() as { count: number }).count

if (propertyCount === 0) {
  const now = new Date().toISOString()

  const properties = [
    {
      id: uuidv4(), name: '山景独栋别墅', zone: '山景区', type: 'entire',
      bedrooms: 3, max_guests: 6, base_guests: 2, base_price: 688, extra_guest_price: 100,
      amenities: ['WiFi', '空调', '停车场', '厨房', '洗衣机', '山景阳台'],
      images: ['villa1.jpg', 'villa1_2.jpg', 'villa1_3.jpg'],
      status: 'available', description: '坐落于山腰的独栋别墅，270度山景环绕，私密性极佳，适合家庭出游'
    },
    {
      id: uuidv4(), name: '云栖山居', zone: '山景区', type: 'entire',
      bedrooms: 2, max_guests: 4, base_guests: 2, base_price: 488, extra_guest_price: 80,
      amenities: ['WiFi', '空调', '壁炉', '露台', '茶室'],
      images: ['cloud1.jpg', 'cloud1_2.jpg'],
      status: 'available', description: '隐于云雾之间的日式山居，配备壁炉与茶室，感受山间宁静'
    },
    {
      id: uuidv4(), name: '松风阁', zone: '山景区', type: 'room',
      bedrooms: 1, max_guests: 2, base_guests: 2, base_price: 328, extra_guest_price: 60,
      amenities: ['WiFi', '空调', '山景窗', '书桌'],
      images: ['pine1.jpg', 'pine1_2.jpg'],
      status: 'available', description: '松林环绕的精致单间，推开窗便是满目苍翠，适合情侣或独自旅行'
    },
    {
      id: uuidv4(), name: '湖畔水屋', zone: '湖景区', type: 'entire',
      bedrooms: 2, max_guests: 5, base_guests: 2, base_price: 788, extra_guest_price: 120,
      amenities: ['WiFi', '空调', '湖景露台', '厨房', '皮划艇', '烧烤架'],
      images: ['lake1.jpg', 'lake1_2.jpg', 'lake1_3.jpg'],
      status: 'available', description: '临湖而建的水屋，推门即见碧波荡漾，附赠皮划艇体验'
    },
    {
      id: uuidv4(), name: '渔歌唱晚', zone: '湖景区', type: 'room',
      bedrooms: 1, max_guests: 3, base_guests: 2, base_price: 368, extra_guest_price: 80,
      amenities: ['WiFi', '空调', '湖景阳台', '垂钓用具'],
      images: ['fish1.jpg', 'fish1_2.jpg'],
      status: 'available', description: '诗意湖景房，落日时分渔歌互答，配备垂钓用具，尽享慢生活'
    },
    {
      id: uuidv4(), name: '湖心小筑', zone: '湖景区', type: 'entire',
      bedrooms: 3, max_guests: 6, base_guests: 2, base_price: 928, extra_guest_price: 150,
      amenities: ['WiFi', '空调', '私人码头', '厨房', '观星台', '烧烤架'],
      images: ['isle1.jpg', 'isle1_2.jpg', 'isle1_3.jpg'],
      status: 'available', description: '湖心岛上的豪华小筑，拥有私人码头与观星台，适合朋友聚会'
    },
    {
      id: uuidv4(), name: '花田蜜语', zone: '花田区', type: 'entire',
      bedrooms: 2, max_guests: 4, base_guests: 2, base_price: 568, extra_guest_price: 88,
      amenities: ['WiFi', '空调', '花园', '秋千', '厨房'],
      images: ['flower1.jpg', 'flower1_2.jpg'],
      status: 'available', description: '花海环绕的浪漫小屋，推窗即见满田花海，是情侣蜜月首选'
    },
    {
      id: uuidv4(), name: '薰衣草之家', zone: '花田区', type: 'room',
      bedrooms: 1, max_guests: 2, base_guests: 2, base_price: 298, extra_guest_price: 58,
      amenities: ['WiFi', '空调', '花田步道', '香薰浴'],
      images: ['lavender1.jpg', 'lavender1_2.jpg'],
      status: 'available', description: '薰衣草花田中的温馨房间，提供香薰浴体验，让人身心放松'
    }
  ]

  const insertProperty = db.prepare(`
    INSERT INTO properties (id, name, zone, type, bedrooms, max_guests, base_guests, base_price, extra_guest_price, amenities, images, status, description)
    VALUES (@id, @name, @zone, @type, @bedrooms, @max_guests, @base_guests, @base_price, @extra_guest_price, @amenities, @images, @status, @description)
  `)

  const insertOrder = db.prepare(`
    INSERT INTO orders (id, property_id, guest_name, guest_phone, check_in, check_out, guests, extra_services, status, total_amount, penalty_amount, created_at, updated_at)
    VALUES (@id, @property_id, @guest_name, @guest_phone, @check_in, @check_out, @guests, @extra_services, @status, @total_amount, @penalty_amount, @created_at, @updated_at)
  `)

  const insertService = db.prepare(`
    INSERT INTO extra_services_catalog (id, name, price, description)
    VALUES (@id, @name, @price, @description)
  `)

  const insertCleaning = db.prepare(`
    INSERT INTO cleaning_tasks (id, property_id, scheduled_date, status, assignee, created_at)
    VALUES (@id, @property_id, @scheduled_date, @status, @assignee, @created_at)
  `)

  const transaction = db.transaction(() => {
    for (const p of properties) {
      insertProperty.run({
        ...p,
        amenities: JSON.stringify(p.amenities),
        images: JSON.stringify(p.images)
      })
    }

    const services = [
      { id: uuidv4(), name: '早餐', price: 38, description: '精选本地食材，营养均衡的中西式早餐' },
      { id: uuidv4(), name: '接机服务', price: 128, description: '机场往返接送，舒适商务车' },
      { id: uuidv4(), name: '洗衣服务', price: 58, description: '专业洗涤烘干，次日送回' },
      { id: uuidv4(), name: '烧烤套餐', price: 198, description: '含食材、调料及烧烤设备租赁' },
      { id: uuidv4(), name: 'SPA体验', price: 268, description: '精油按摩60分钟，舒缓身心' }
    ]

    for (const s of services) {
      insertService.run(s)
    }

    const sampleOrders = [
      {
        id: uuidv4(), property_id: properties[0].id, guest_name: '张三', guest_phone: '13800138001',
        check_in: '2026-06-10', check_out: '2026-06-13', guests: 4,
        extra_services: JSON.stringify([{ id: services[0].id, name: '早餐', price: 38, quantity: 3 }]),
        status: 'completed', total_amount: 2264, penalty_amount: 0,
        created_at: '2026-06-01T10:00:00.000Z', updated_at: '2026-06-13T12:00:00.000Z'
      },
      {
        id: uuidv4(), property_id: properties[3].id, guest_name: '李四', guest_phone: '13900139002',
        check_in: '2026-06-15', check_out: '2026-06-18', guests: 3,
        extra_services: JSON.stringify([
          { id: services[0].id, name: '早餐', price: 38, quantity: 3 },
          { id: services[3].id, name: '烧烤套餐', price: 198, quantity: 1 }
        ]),
        status: 'checked_in', total_amount: 2810, penalty_amount: 0,
        created_at: '2026-06-05T14:30:00.000Z', updated_at: '2026-06-15T14:00:00.000Z'
      },
      {
        id: uuidv4(), property_id: properties[6].id, guest_name: '王五', guest_phone: '13700137003',
        check_in: '2026-06-20', check_out: '2026-06-22', guests: 2,
        extra_services: JSON.stringify([{ id: services[4].id, name: 'SPA体验', price: 268, quantity: 1 }]),
        status: 'pending', total_amount: 1404, penalty_amount: 0,
        created_at: '2026-06-10T09:15:00.000Z', updated_at: '2026-06-10T09:15:00.000Z'
      },
      {
        id: uuidv4(), property_id: properties[1].id, guest_name: '赵六', guest_phone: '13600136004',
        check_in: '2026-06-25', check_out: '2026-06-27', guests: 2,
        extra_services: JSON.stringify([]),
        status: 'pending', total_amount: 976, penalty_amount: 0,
        created_at: '2026-06-12T16:45:00.000Z', updated_at: '2026-06-12T16:45:00.000Z'
      },
      {
        id: uuidv4(), property_id: properties[4].id, guest_name: '钱七', guest_phone: '13500135005',
        check_in: '2026-05-20', check_out: '2026-05-22', guests: 2,
        extra_services: JSON.stringify([{ id: services[1].id, name: '接机服务', price: 128, quantity: 1 }]),
        status: 'cancelled', total_amount: 864, penalty_amount: 86.4,
        created_at: '2026-05-10T11:20:00.000Z', updated_at: '2026-05-18T08:30:00.000Z'
      },
      {
        id: uuidv4(), property_id: properties[7].id, guest_name: '孙八', guest_phone: '13400134006',
        check_in: '2026-07-01', check_out: '2026-07-03', guests: 2,
        extra_services: JSON.stringify([
          { id: services[0].id, name: '早餐', price: 38, quantity: 2 },
          { id: services[4].id, name: 'SPA体验', price: 268, quantity: 1 }
        ]),
        status: 'pending', total_amount: 936, penalty_amount: 0,
        created_at: '2026-06-13T20:00:00.000Z', updated_at: '2026-06-13T20:00:00.000Z'
      }
    ]

    for (const o of sampleOrders) {
      insertOrder.run(o)
    }

    insertCleaning.run({
      id: uuidv4(), property_id: properties[0].id, scheduled_date: '2026-06-13',
      status: 'completed', assignee: '保洁员小李', created_at: '2026-06-13T12:00:00.000Z'
    })

    insertCleaning.run({
      id: uuidv4(), property_id: properties[3].id, scheduled_date: '2026-06-18',
      status: 'pending', assignee: '保洁员小王', created_at: '2026-06-15T14:00:00.000Z'
    })
  })

  transaction()
}

export function parseJsonField<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export { db }
