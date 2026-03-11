import nlp from 'compromise'

export interface Entity {
  text: string
  type: 'person' | 'place'
  offset: number
  length: number
}

// 自定义中文人名/地名词典（可扩展）
const chinesePersonNames = new Set<string>()
const chinesePlaceNames = new Set<string>()

// 中文姓氏列表（常见100个）
const chineseSurnames = [
  '赵','钱','孙','李','周','吴','郑','王','冯','陈','褚','卫','蒋','沈','韩','杨',
  '朱','秦','尤','许','何','吕','施','张','孔','曹','严','华','金','魏','陶','姜',
  '戚','谢','邹','喻','柏','水','窦','章','云','苏','潘','葛','奚','范','彭','郎',
  '鲁','韦','昌','马','苗','凤','花','方','俞','任','袁','柳','酆','鲍','史','唐',
  '费','廉','岑','薛','雷','贺','倪','汤','滕','殷','罗','毕','郝','邬','安','常',
  '乐','于','时','傅','皮','卞','齐','康','伍','余','元','卜','顾','孟','平','黄',
  '和','穆','萧','尹','姚','邵','湛','汪','祁','毛','禹','狄','米','贝','明','臧',
  '计','伏','成','戴','谈','宋','茅','庞','熊','纪','舒','屈','项','祝','董','梁',
  '杜','阮','蓝','闵','席','季','麻','强','贾','路','娄','危','江','童','颜','郭',
  '梅','盛','林','刁','钟','徐','丘','骆','高','夏','蔡','田','樊','胡','凌','霍',
  '虞','万','支','柯','昝','管','卢','莫','经','房','裘','缪','干','解','应','宗',
  '丁','宣','贲','邓','郁','单','杭','洪','包','诸','左','石','崔','吉','钮','龚',
  '程','嵇','邢','滑','裴','陆','荣','翁','荀','羊','於','惠','甄','曲','家','封',
  '芮','羿','储','靳','汲','邴','糜','松','井','段','富','巫','乌','焦','巴','弓',
  '牧','隗','山','谷','车','侯','宓','蓬','全','郗','班','仰','秋','仲','伊','宫',
  '宁','仇','栾','暴','甘','钭','厉','戎','祖','武','符','刘','景','詹','束','龙',
  '叶','幸','司','韶','郜','黎','蓟','溥','印','宿','白','怀','蒲','邰','从','鄂',
  '索','咸','籍','赖','卓','蔺','屠','蒙','池','乔','阴','郁','胥','能','苍','双',
  '闻','莘','党','翟','谭','贡','劳','逄','姬','申','扶','堵','冉','宰','郦','雍',
  '却','璩','桑','桂','濮','牛','寿','通','边','扈','燕','冀','僧','浦','尚','农',
  '温','别','庄','晏','柴','瞿','阎','充','慕','连','茹','习','宦','艾','鱼','容',
  '向','古','易','慎','戈','廖','庾','终','暨','居','衡','步','都','耿','满','弘',
  '匡','国','文','寇','广','禄','阙','东','欧','殳','沃','利','蔚','越','夔','隆',
  '师','巩','厍','聂','晁','勾','敖','融','冷','訾','辛','阚','那','简','饶','空'
]

// 中文人名识别正则（2-4字中文名）
const chineseNamePattern = new RegExp(
  `(?:${chineseSurnames.join('|')})[\u4e00-\u9fa5]{1,3}`,
  'g'
)

// 中文地名后缀
const placeNameSuffixes = [
  '省', '市', '县', '区', '镇', '乡', '村', '街', '路', '巷', '胡同',
  '山', '河', '湖', '海', '岛', '洲', '峰', '岭', '谷', '坡', '坝',
  '关', '口', '门', '桥', '渡', '港', '湾', '滩', '塘', '池', '泉',
  '寺', '庙', '观', '殿', '塔', '亭', '阁', '楼', '台', '苑', '园',
  '城', '堡', '寨', '营', '屯', '庄', '坊',
  '国', '洋', '原', '林', '沙', '崖'
]

const chinesePlacePattern = new RegExp(
  `[\u4e00-\u9fa5]{1,6}(?:${placeNameSuffixes.join('|')})`,
  'g'
)

/**
 * 用 compromise 识别英文命名实体
 */
function recognizeEnglishEntities(text: string): Entity[] {
  const entities: Entity[] = []
  const doc = nlp(text)

  // 识别人名
  const people = doc.people().json()
  for (const p of people) {
    const name = p.text
    if (name && name.length > 1) {
      const idx = text.indexOf(name)
      if (idx !== -1) {
        entities.push({
          text: name,
          type: 'person',
          offset: idx,
          length: name.length,
        })
      }
    }
  }

  // 识别地名
  const places = doc.places().json()
  for (const p of places) {
    const name = p.text
    if (name && name.length > 1) {
      const idx = text.indexOf(name)
      if (idx !== -1) {
        entities.push({
          text: name,
          type: 'place',
          offset: idx,
          length: name.length,
        })
      }
    }
  }

  return entities
}

/**
 * 识别中文命名实体
 */
function recognizeChineseEntities(text: string): Entity[] {
  const entities: Entity[] = []
  const seen = new Set<string>()

  // 识别中文人名
  let match: RegExpExecArray | null
  const nameRegex = new RegExp(chineseNamePattern.source, 'g')
  while ((match = nameRegex.exec(text)) !== null) {
    const name = match[0]
    // 过滤太短或太常见的词
    if (name.length >= 2 && !seen.has(`person:${name}`)) {
      seen.add(`person:${name}`)
      // 添加到自定义词典
      chinesePersonNames.add(name)
      entities.push({
        text: name,
        type: 'person',
        offset: match.index,
        length: name.length,
      })
    }
  }

  // 识别中文地名
  const placeRegex = new RegExp(chinesePlacePattern.source, 'g')
  while ((match = placeRegex.exec(text)) !== null) {
    const name = match[0]
    if (name.length >= 2 && !seen.has(`place:${name}`)) {
      seen.add(`place:${name}`)
      chinesePlaceNames.add(name)
      entities.push({
        text: name,
        type: 'place',
        offset: match.index,
        length: name.length,
      })
    }
  }

  return entities
}

/**
 * 判断文本是否包含中文
 */
function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fa5]/.test(text)
}

/**
 * 主入口：识别文本中的命名实体（人名、地名）
 */
export function recognizeEntities(text: string): Entity[] {
  if (!text || text.trim().length === 0) return []

  const entities: Entity[] = []

  if (containsChinese(text)) {
    entities.push(...recognizeChineseEntities(text))
  }

  // 始终尝试英文识别（文本可能混合中英文）
  entities.push(...recognizeEnglishEntities(text))

  // 去重 & 按位置排序
  const uniqueEntities = deduplicateEntities(entities)
  uniqueEntities.sort((a, b) => a.offset - b.offset)

  return uniqueEntities
}

/**
 * 去重：如果多个实体覆盖相同区域，保留较长的
 */
function deduplicateEntities(entities: Entity[]): Entity[] {
  const sorted = [...entities].sort((a, b) => a.offset - b.offset || b.length - a.length)
  const result: Entity[] = []

  for (const entity of sorted) {
    const overlaps = result.some(
      (existing) =>
        entity.offset < existing.offset + existing.length &&
        entity.offset + entity.length > existing.offset
    )
    if (!overlaps) {
      result.push(entity)
    }
  }

  return result
}

/**
 * 获取已识别的所有人名
 */
export function getKnownPersonNames(): string[] {
  return Array.from(chinesePersonNames)
}

/**
 * 获取已识别的所有地名
 */
export function getKnownPlaceNames(): string[] {
  return Array.from(chinesePlaceNames)
}

/**
 * 添加自定义人名
 */
export function addCustomPersonName(name: string) {
  chinesePersonNames.add(name)
}

/**
 * 添加自定义地名
 */
export function addCustomPlaceName(name: string) {
  chinesePlaceNames.add(name)
}
