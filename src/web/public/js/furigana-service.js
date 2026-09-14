/**
 * 游戏王 OCG 日文卡面专属一键注音引擎 (FuriganaService v1.0)
 * 对齐 LD 制卡器 (亮弟 YGOLD Card Maker) 规范语法 `[漢字(ルビ)]` 与官方 OCG 印刷振假名排版
 * 功能特性：
 * 1. 经典及最新全量官方系列/卡名精准中日对照与官方注音库 (如 青眼(ブルーアイズ)、真紅眼(レッドアイズ) 等)
 * 2. 汉字分词注音与假名助词自动避让 (`[青眼(ブルーアイズ)]の[白龍(ホワイト・ドラゴン)]`)
 * 3. 独立振假名输入智能拆分合并
 * 4. 自定义汉字词条在音/训读及决斗特定假名注音合成
 */

class FuriganaService {
  constructor() {
    // 官方经典与流行卡名直接注音映射表 (精确匹配)
    this.EXACT_CARD_MAP = {
      // 经典三剑客与王牌
      '青眼白龙': '[青眼(ブルーアイズ)]の[白龍(ホワイト・ドラゴン)]',
      '青眼の白龍': '[青眼(ブルーアイズ)]の[白龍(ホワイト・ドラゴン)]',
      '真红眼黑龙': '[真紅眼(レッドアイズ)]の[黒竜(ブラック・ドラゴン)]',
      '真紅眼の黒竜': '[真紅眼(レッドアイズ)]の[黒竜(ブラック・ドラゴン)]',
      '黑魔导': 'ブラック・マジシャン',
      '黑魔术师': 'ブラック・マジシャン',
      'ブラック・マジシャン': 'ブラック・マジシャン',
      '黑魔导女孩': 'ブラック・マジシャン・ガール',
      '黑魔术少女': 'ブラック・マジシャン・ガール',
      'ブラック・マジシャン・ガール': 'ブラック・マジシャン・ガール',
      '死者苏生': '[死者蘇生(ししゃそせい)]',
      '死者蘇生': '[死者蘇生(ししゃそせい)]',
      '究极创世神 艾克佐迪亚': '[究極創世神(きゅうきょくそうせいしん)] エクゾディア',
      '究極創世神 エクゾディア': '[究極創世神(きゅうきょくそうせいしん)] エクゾディア',

      // 泛用手坑与泛用魔法陷阱
      '灰流丽': '[灰流(はる)]うらら',
      '灰流うらら': '[灰流(はる)]うらら',
      '增殖的G': '[増殖(ぞうしょく)]するＧ',
      '増殖するG': '[増殖(ぞうしょく)]するＧ',
      '増殖するＧ': '[増殖(ぞうしょく)]するＧ',
      '屋敷童': '[屋敷(やしき)]わらし',
      '屋敷わらし': '[屋敷(やしき)]わらし',
      '幽鬼兔': '[幽鬼(ゆき)]うさぎ',
      '幽鬼うさぎ': '[幽鬼(ゆき)]うさぎ',
      '浮幽樱': '[浮幽(ふゆ)]さくら',
      '浮幽さくら': '[浮幽(ふゆ)]さくら',
      '朔夜时雨': '[朔夜(さよ)]しぐれ',
      '朔夜しぐれ': '[朔夜(さよ)]しぐれ',
      '儚无水木': '[儚無(はな)]みずき',
      '儚無みずき': '[儚無(はな)]みずき',
      '原始生命态 尼比鲁': '[原始生命態(げんしせいめいたい)]ニビル',
      '原始生命态尼比鲁': '[原始生命態(げんしせいめいたい)]ニビル',
      '原始生命態ニビル': '[原始生命態(げんしせいめいたい)]ニビル',
      '效果遮蒙者': 'エフェクト・ヴェーラー',
      'エフェクト・ヴェーラー': 'エフェクト・ヴェーラー',
      '无限泡影': '[無限(むげん)][泡影(ほうよう)]',
      '無限泡影': '[無限(むげん)][泡影(ほうよう)]',
      '墓穴的指名者': '[墓穴(はかあな)]の[指名者(しめいしゃ)]',
      '墓穴の指名者': '[墓穴(はかあな)]の[指名者(しめいしゃ)]',
      '抹杀之指名者': '[抹殺(まっさつ)]の[指名者(しめいしゃ)]',
      '抹殺の指名者': '[抹殺(まっさつ)]の[指名者(しめいしゃ)]',
      '三战之才': '[三戦(さんせん)]の[才(さい)]',
      '三戦の才': '[三戦(さんせん)]の[才(さい)]',
      '三战之号': '[三戦(さんせん)]の[号(ごう)]',
      '三戦の号': '[三戦(さんせん)]の[号(ごう)]',
      '禁忌的一滴': '[禁(きん)]じられた[一滴(いってき)]',
      '禁じられた一滴': '[禁(きん)]じられた[一滴(いってき)]',
      '天霆号 阿宙斯': '[天霆號(ネガロギア)]アーゼウス',
      '天霆號アーゼウス': '[天霆號(ネガロギア)]アーゼウス',
      '万物创世龙': '[万物創世龍(テン・サウザンド・ドラゴン)]',
      '万物創世龍': '[万物創世龍(テン・サウザンド・ドラゴン)]',
      '超魔导剑士': '[超魔導剣士(ちょうまどうけんし)]－ブラック・パラディン',
      '超魔導剣士－ブラック・パラディン': '[超魔導剣士(ちょうまどうけんし)]－ブラック・パラディン',
      '混沌战士': '[カオス・ソルジャー]',
      'カオス・ソルジャー': '[カオス・ソルジャー]',
      '究极龙骑士': '[究極竜騎士(マスター・オブ・ドラゴンナイト)]',
      '究極竜騎士': '[究極竜騎士(マスター・オブ・ドラゴンナイト)]',
      '神之宣告': '[神(かみ)]の[宣告(せんこく)]',
      '神の宣告': '[神(かみ)]の[宣告(せんこく)]',
      '神之通告': '[神(かみ)]の[通告(つうこく)]',
      '神の通告': '[神(かみ)]の[通告(つうこく)]',
      '神之警告': '[神(かみ)]の[警告(けいこく)]',
      '神の警告': '[神(かみ)]の[警告(けいこく)]',
      '强欲之壶': '[強欲(ごうよく)]な[壺(つぼ)]',
      '強欲な壺': '[強欲(ごうよく)]な[壺(つぼ)]',
      '贪欲之壶': '[貪欲(どんよく)]な[壺(つぼ)]',
      '貪欲な壺': '[貪欲(どんよく)]な[壺(つぼ)]',
      '金满而谦虚之壶': '[金満(きんまん)]で[謙虚(けんきょ)]な[壺(つぼ)]',
      '金満で謙虚な壺': '[金満(きんまん)]で[謙虚(けんきょ)]な[壺(つぼ)]',
      '强欲而贪欲之壶': '[強欲(ごうよく)]で[貪欲(どんよく)]な[壺(つぼ)]',
      '強欲で貪欲な壺': '[強欲(ごうよく)]で[貪欲(どんよく)]な[壺(つぼ)]',
      '强欲而谦虚之壶': '[强欲(ごうよく)]で[謙虚(けんきょ)]な[壺(つぼ)]',
      '強欲で謙虚な壺': '[強欲(ごうよく)]で[謙虚(けんきょ)]な[壺(つぼ)]',
      '羽毛扫': 'ハーピィの[羽根帚(はねぼうき)]',
      'ハーピィの羽根帚': 'ハーピィの[羽根帚(はねぼうき)]',
      '雷击': 'サンダー・ボルト',
      '黑洞': 'ブラック・ホール',
      '召唤僧': '[召喚僧(しょうかんそう)]サモンプリースト',
      '召喚僧サモンプリースト': '[召喚僧(しょうかんそう)]サモンプリースト'
    };

    // 官方系列 / 字段注音映射 (按长度从长到短优先匹配)
    this.ARCHETYPE_RUBY_MAP = [
      { zh: '原始生命态', ja: '原始生命態', ruby: 'げんしせいめいたい' },
      { zh: '究极宝玉神', ja: '究極宝玉神', ruby: 'きゅうきょくほうぎょくしん' },
      { zh: '幻影骑士团', ja: '幻影騎士団', ruby: 'ファントム・ナイツ' },
      { zh: '急袭猛禽', ja: '急襲猛禽', ruby: 'レイド・ラプターズ' },
      { zh: '超魔导剑士', ja: '超魔導剣士', ruby: 'ちょうまどうけんし' },
      { zh: '超魔导', ja: '超魔導', ruby: 'ちょうまどう' },
      { zh: '银河眼', ja: '銀河眼', ruby: 'ギャラクシーアイズ' },
      { zh: '异色眼', ja: '異色眼', ruby: 'オッドアイズ' },
      { zh: '真红眼', ja: '真紅眼', ruby: 'レッドアイズ' },
      { zh: '青眼', ja: '青眼', ruby: 'ブルーアイズ' },
      { zh: '暗黑界', ja: '暗黒界', ruby: 'ダーク・ワールド' },
      { zh: '深渊之兽', ja: '深淵の獣', ruby: 'ビーステッド' },
      { zh: '白银之城', ja: '白銀の城', ruby: 'ラビュリンス' },
      { zh: '救祓少女', ja: '救祓少女', ruby: 'エクスシスター' },
      { zh: '珠泪哀歌族', ja: '珠泪哀歌族', ruby: 'ティアラメンツ' },
      { zh: '俱舍怒威族', ja: '俱舎怒威族', ruby: 'クシャトリラ' },
      { zh: '超重武者', ja: '超重武者', ruby: 'ちょうじゅうむしゃ' },
      { zh: '海晶少女', ja: '海晶少女', ruby: 'マリンセス' },
      { zh: '转生炎兽', ja: '転生炎獣', ruby: 'サラマングレイト' },
      { zh: '自奏圣乐', ja: '自奏聖楽', ruby: 'オルフェゴール' },
      { zh: '魔界剧团', ja: '魔界劇団', ruby: 'アビス・アクター' },
      { zh: '捕食植物', ja: '捕食植物', ruby: 'プレデター・プランツ' },
      { zh: '宝玉兽', ja: '宝玉獣', ruby: 'ほうぎょくじゅう' },
      { zh: '古代的机械', ja: '古代の機械', ruby: 'アンティーク・ギア' },
      { zh: '希望皇 霍普', ja: '希望皇ホープ', ruby: 'きぼうおうホープ' },
      { zh: '希望皇', ja: '希望皇', ruby: 'きぼうおう' },
      { zh: '六武众', ja: '六武衆', ruby: 'ろくぶしゅう' },
      { zh: '不知火', ja: '不知火', ruby: 'しらぬい' },
      { zh: '冰结界', ja: '氷結界', ruby: 'ひょうけっかい' },
      { zh: '闪刀姬', ja: '閃刀姫', ruby: 'せんとうき' },
      { zh: '虫惑魔', ja: '蟲惑魔', ruby: 'こわくま' },
      { zh: '蛊惑魔', ja: '蠱惑魔', ruby: 'こわくま' },
      { zh: '堕天使', ja: '堕天使', ruby: 'だてんし' },
      { zh: '电脑堺', ja: '電脳堺', ruby: 'でんのうかい' },
      { zh: '龙辉巧', ja: '竜輝巧', ruby: 'ドライトロン' },
      { zh: '随风旅鸟', ja: '随風旅鳥', ruby: 'ふわんだりぃず' },
      { zh: '相剑', ja: '相剣', ruby: 'そうけん' },
      { zh: '天威', ja: '天威', ruby: 'てんい' },
      { zh: '肃声', ja: '粛声', ruby: 'しゅくせい' },
      { zh: '天杯龙', ja: '天杯龍', ruby: 'テンパイりゅう' },
      { zh: '刻魔', ja: '刻魔', ruby: 'デモンスミス' },
      { zh: '蛇眼', ja: '蛇眼', ruby: 'スネークアイ' },
      { zh: '百夫长', ja: '百夫長', ruby: 'センチュリオン' },
      { zh: '破械', ja: '破械', ruby: 'はかい' },
      { zh: '烙印', ja: '烙印', ruby: 'らくいん' },
      { zh: '灵兽', ja: '霊獣', ruby: 'れいじゅう' },
      { zh: '魔妖', ja: '魔妖', ruby: 'まやかし' },
      { zh: '魔弹', ja: '魔弾', ruby: 'まだん' },
      { zh: '方界', ja: '方界', ruby: 'ほうかい' },
      { zh: '守墓', ja: '守墓', ruby: 'はかもり' },
      { zh: '光道', ja: '光道', ruby: 'ライトロード' },
      { zh: '白龙', ja: '白龍', ruby: 'ホワイト・ドラゴン' },
      { zh: '黑龙', ja: '黒竜', ruby: 'ブラック・ドラゴン' },
      { zh: '白龍', ja: '白龍', ruby: 'ホワイト・ドラゴン' },
      { zh: '黒竜', ja: '黒竜', ruby: 'ブラック・ドラゴン' }
    ];

    // 常用决斗词条与汉字多音复合表 (对任意 DIY / 自定义卡名汉字注音)
    this.KANJI_WORD_MAP = [
      { kanji: '究極創世神', ruby: 'きゅうきょくそうせいしん' },
      { kanji: '創世神', ruby: 'そうせいしん' },
      { kanji: '竜騎士', ruby: 'りゅうきし' },
      { kanji: '魔導師', ruby: 'まどうし' },
      { kanji: '魔術師', ruby: 'まじゅつし' },
      { kanji: '破壊神', ruby: 'はかいしん' },
      { kanji: '支配者', ruby: 'ルーラー' },
      { kanji: '執行者', ruby: 'エンフォーサー' },
      { kanji: '守護者', ruby: 'ガーディアン' },
      { kanji: '監視者', ruby: 'ウォッチャー' },
      { kanji: '暗黒界', ruby: 'ダーク・ワールド' },
      { kanji: '指名者', ruby: 'しめいしゃ' },
      { kanji: '死者', ruby: 'ししゃ' },
      { kanji: '蘇生', ruby: 'そせい' },
      { kanji: '破壊', ruby: 'はかい' },
      { kanji: '消滅', ruby: 'しょうめつ' },
      { kanji: '召喚', ruby: 'しょうかん' },
      { kanji: '特殊', ruby: 'とくしゅ' },
      { kanji: '融合', ruby: 'ゆうごう' },
      { kanji: '儀式', ruby: 'ぎしき' },
      { kanji: '契約', ruby: 'けいやく' },
      { kanji: '誓約', ruby: 'せいやく' },
      { kanji: '約束', ruby: 'やくそく' },
      { kanji: '運命', ruby: 'デスティニー' },
      { kanji: '宿命', ruby: 'しゅくめい' },
      { kanji: '因果', ruby: 'いんが' },
      { kanji: '輪廻', ruby: 'りんね' },
      { kanji: '奇跡', ruby: 'ミラクル' },
      { kanji: '希望', ruby: 'ホープ' },
      { kanji: '絶望', ruby: 'ぜつぼう' },
      { kanji: '勝利', ruby: 'しょうり' },
      { kanji: '栄光', ruby: 'えいこう' },
      { kanji: '真実', ruby: 'しんじつ' },
      { kanji: '幻想', ruby: 'げんそう' },
      { kanji: '混沌', ruby: 'カオス' },
      { kanji: '秩序', ruby: 'オーダー' },
      { kanji: '究極', ruby: 'きゅうきょく' },
      { kanji: '超越', ruby: 'ちょうえつ' },
      { kanji: '絶対', ruby: 'ぜったい' },
      { kanji: '無限', ruby: 'むげん' },
      { kanji: '永遠', ruby: 'えいえん' },
      { kanji: '漆黒', ruby: 'しっこく' },
      { kanji: '白銀', ruby: 'はくぎん' },
      { kanji: '黄金', ruby: 'おうごん' },
      { kanji: '真紅', ruby: 'しんく' },
      { kanji: '深淵', ruby: 'アビス' },
      { kanji: '奈落', ruby: 'ならく' },
      { kanji: '激流', ruby: 'げきりゅう' },
      { kanji: '烈火', ruby: 'れっか' },
      { kanji: '疾風', ruby: 'しっぷう' },
      { kanji: '雷鳴', ruby: 'らいめい' },
      { kanji: '覚醒', ruby: 'かくせい' },
      { kanji: '転生', ruby: 'てんせい' },
      { kanji: '降臨', ruby: 'こうりん' },
      { kanji: '終焉', ruby: 'しゅうえん' },
      { kanji: '破滅', ruby: 'はめつ' },
      { kanji: '宣告', ruby: 'せんこく' },
      { kanji: '警告', ruby: 'けいこく' },
      { kanji: '通告', ruby: 'つうこく' },
      { kanji: '審判', ruby: 'しんぱん' },
      { kanji: '断罪', ruby: 'だんざい' },
      { kanji: '抹殺', ruby: 'まっさつ' },
      { kanji: '墓穴', ruby: 'はかあな' },
      { kanji: '強欲', ruby: 'ごうよく' },
      { kanji: '貪欲', ruby: 'どんよく' },
      { kanji: '金満', ruby: 'きんまん' },
      { kanji: '謙虚', ruby: 'けんきょ' },
      { kanji: '天使', ruby: 'てんし' },
      { kanji: '悪魔', ruby: 'あくま' },
      { kanji: '精霊', ruby: 'せいれい' },
      { kanji: '妖精', ruby: 'ようせい' },
      { kanji: '幻獣', ruby: 'げんじゅう' },
      { kanji: '魔獣', ruby: 'まじゅう' },
      { kanji: '戦士', ruby: 'せんし' },
      { kanji: '騎士', ruby: 'きし' },
      { kanji: '英雄', ruby: 'ヒーロー' },
      { kanji: '魔導', ruby: 'まどう' },
      { kanji: '魔法', ruby: 'まほう' },
      { kanji: '世界', ruby: 'せかい' },
      { kanji: '宇宙', ruby: 'コズミック' },
      { kanji: '銀河', ruby: 'ギャラクシー' },
      { kanji: '次元', ruby: 'ディメンション' },
      { kanji: '未来', ruby: 'みらい' },
      { kanji: '古代', ruby: 'アンティーク' },
      { kanji: '機械', ruby: 'きかい' },
      { kanji: '創世', ruby: 'そうせい' },
      { kanji: '神聖', ruby: 'しんせい' },
      { kanji: '封印', ruby: 'ふういん' },
      { kanji: '解放', ruby: 'かいほう' },
      { kanji: '再生', ruby: 'さいせい' },
      { kanji: '新生', ruby: 'しんせい' },
      { kanji: '結晶', ruby: 'けっしょう' },
      { kanji: '魔眼', ruby: 'まがん' },
      { kanji: '邪眼', ruby: 'じゃがん' },
      { kanji: '双頭', ruby: 'そうとう' },
      { kanji: '百獣', ruby: 'ひゃくじゅう' },
      { kanji: '巨神', ruby: 'きょしん' },
      { kanji: '邪神', ruby: 'じゃしん' },
      { kanji: '幻魔', ruby: 'げんま' },
      { kanji: '波動', ruby: 'はどう' },
      { kanji: '閃光', ruby: 'せんこう' },
      { kanji: '暗黒', ruby: 'あんこく' },
      { kanji: '光輝', ruby: 'こうき' },
      { kanji: '灼熱', ruby: 'しゃくねつ' },
      { kanji: '凍結', ruby: 'とうけつ' },
      { kanji: '疾駆', ruby: 'しっく' },
      { kanji: '迅雷', ruby: 'じんらい' },
      { kanji: '大地', ruby: 'だいち' },
      { kanji: '天空', ruby: 'てんくう' },
      { kanji: '海原', ruby: 'うなばら' },
      { kanji: '星屑', ruby: 'スターダスト' },
      { kanji: '黑竜', ruby: 'ブラック・ドラゴン' },
      { kanji: '黒竜', ruby: 'ブラック・ドラゴン' },
      { kanji: '白龍', ruby: 'ホワイト・ドラゴン' },
      { kanji: '白龙', ruby: 'ホワイト・ドラゴン' },
      { kanji: '黑龙', ruby: 'ブラック・ドラゴン' },
      { kanji: '竜', ruby: 'りゅう' },
      { kanji: '龍', ruby: 'ドラゴン' },
      { kanji: '神', ruby: 'かみ' },
      { kanji: '王', ruby: 'おう' },
      { kanji: '帝', ruby: 'てい' },
      { kanji: '皇', ruby: 'こう' },
      { kanji: '姫', ruby: 'ひめ' },
      { kanji: '剑', ruby: 'けん' },
      { kanji: '劍', ruby: 'けん' },
      { kanji: '剣', ruby: 'けん' },
      { kanji: '刀', ruby: 'かたな' },
      { kanji: '槍', ruby: 'やり' },
      { kanji: '盾', ruby: 'たて' },
      { kanji: '鎧', ruby: 'よろい' },
      { kanji: '翼', ruby: 'つばさ' },
      { kanji: '牙', ruby: 'きば' },
      { kanji: '爪', ruby: 'つめ' },
      { kanji: '角', ruby: 'つの' },
      { kanji: '眼', ruby: 'め' },
      { kanji: '瞳', ruby: 'ひとみ' },
      { kanji: '心', ruby: 'こころ' },
      { kanji: '魂', ruby: 'たましい' },
      { kanji: '命', ruby: 'いのち' },
      { kanji: '力', ruby: 'ちから' },
      { kanji: '拳', ruby: 'こぶし' },
      { kanji: '影', ruby: 'かげ' },
      { kanji: '光', ruby: 'ひかり' },
      { kanji: '闇', ruby: 'やみ' },
      { kanji: '炎', ruby: 'ほのお' },
      { kanji: '水', ruby: 'みず' },
      { kanji: '風', ruby: 'かぜ' },
      { kanji: '地', ruby: 'ち' },
      { kanji: '雷', ruby: 'いかずち' },
      { kanji: '氷', ruby: 'こおり' },
      { kanji: '星', ruby: 'ほし' },
      { kanji: '月', ruby: 'つき' },
      { kanji: '陽', ruby: 'よう' },
      { kanji: '花', ruby: 'はな' },
      { kanji: '木', ruby: 'き' },
      { kanji: '森', ruby: 'もり' },
      { kanji: '山', ruby: 'やま' },
      { kanji: '海', ruby: 'うみ' },
      { kanji: '空', ruby: 'そら' },
      { kanji: '嵐', ruby: 'あらし' },
      { kanji: '霧', ruby: 'きり' },
      { kanji: '壺', ruby: 'つぼ' },
      { kanji: '箱', ruby: 'はこ' },
      { kanji: '城', ruby: 'しろ' },
      { kanji: '宮', ruby: 'みや' },
      { kanji: '門', ruby: 'もん' },
      { kanji: '塔', ruby: 'とう' },
      { kanji: '壁', ruby: 'かべ' },
      { kanji: '船', ruby: 'ふね' },
      { kanji: '金', ruby: 'きん' },
      { kanji: '銀', ruby: 'ぎん' },
      { kanji: '玉', ruby: 'たま' },
      { kanji: '宝', ruby: 'たから' },
      { kanji: '鏡', ruby: 'かがみ' },
      { kanji: '鈴', ruby: 'すず' }
    ];

    // 效果文本常用 OCG 术语注音表 (用于为日文效果文自动加振假名)
    // 长词优先，避免「攻撃力」被「攻撃」先行替换
    this.EFFECT_TEXT_RUBY_MAP = [
      { kanji: '攻撃力', ruby: 'こうげきりょく' },
      { kanji: '守備力', ruby: 'しゅびりょく' },
      { kanji: '特殊召喚', ruby: 'とくしゅしょうかん' },
      { kanji: '効果', ruby: 'こうか' },
      { kanji: '発動', ruby: 'はつどう' },
      { kanji: '墓地', ruby: 'ぼち' },
      { kanji: '手札', ruby: 'てふだ' },
      { kanji: '自分', ruby: 'じぶん' },
      { kanji: '相手', ruby: 'あいて' },
      { kanji: '場合', ruby: 'ばあい' },
      { kanji: '選択', ruby: 'せんたく' },
      { kanji: '除外', ruby: 'じょがい' },
      { kanji: '攻撃', ruby: 'こうげき' },
      { kanji: '守備', ruby: 'しゅび' },
      { kanji: '表示', ruby: 'ひょうじ' },
      { kanji: '存在', ruby: 'そんざい' },
      { kanji: '対象', ruby: 'たいしょう' },
      { kanji: '無効', ruby: 'むこう' },
      { kanji: '破壊', ruby: 'はかい' },
      { kanji: '加える', ruby: 'くわえる' },
      { kanji: '送る', ruby: 'おくる' },
      { kanji: '戻す', ruby: 'もどす' },
      { kanji: '得る', ruby: 'える' },
      { kanji: '行う', ruby: 'おこなう' },
      { kanji: '使用', ruby: 'しよう' },
      { kanji: '宣言', ruby: 'せんげん' },
      { kanji: '同名', ruby: 'どうめい' },
      { kanji: '以上', ruby: 'いじょう' },
      { kanji: '以下', ruby: 'いか' },
      { kanji: '自身', ruby: 'じしん' },
      { kanji: '枚', ruby: 'まい' },
      { kanji: '選ぶ', ruby: 'えらぶ' },
      { kanji: '払う', ruby: 'はらう' },
      { kanji: '捨てる', ruby: 'すてる' },
      { kanji: '引く', ruby: 'ひく' },
      { kanji: '与える', ruby: 'あたえる' },
      { kanji: '受ける', ruby: 'うける' },
      { kanji: '回復', ruby: 'かいふく' },
      { kanji: '回', ruby: 'かい' },
      { kanji: '度', ruby: 'ど' },
      { kanji: '枚数', ruby: 'まいすう' },
      { kanji: '体', ruby: 'たい' },
      { kanji: '発動する', ruby: '' }
    ].filter(item => item.ruby);
    this.jaCardDict = null;
    this.initDictPromise = null;
    this.loadDictionary();
  }

  async loadDictionary() {
    if (this.jaCardDict) return this.jaCardDict;
    if (this.initDictPromise) return this.initDictPromise;

    this.initDictPromise = (async () => {
      try {
        if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
          const resp = await fetch('./assets/yugioh/ja-card-names.json');
          if (resp.ok) {
            this.jaCardDict = await resp.json();
          }
        } else {
          // Node.js 环境
          const fs = await import('fs');
          const path = await import('path');
          const candidates = [
            path.resolve('src/web/public/assets/yugioh/ja-card-names.json'),
            path.resolve('public/assets/yugioh/ja-card-names.json')
          ];
          for (const p of candidates) {
            if (fs.existsSync(p)) {
              this.jaCardDict = JSON.parse(fs.readFileSync(p, 'utf-8'));
              break;
            }
          }
        }
      } catch (e) {
        console.warn('[FuriganaService] Dict load notice:', e.message);
      }
      return this.jaCardDict;
    })();

    return this.initDictPromise;
  }

  /**
   * 将中文卡名翻译转换为官方 OCG 日文卡名
   */
  getJapaneseName(cnName) {
    if (!cnName) return '';
    const clean = String(cnName).trim();
    if (this.EXACT_CARD_MAP[clean]) {
      return this.EXACT_CARD_MAP[clean];
    }
    if (this.jaCardDict && this.jaCardDict[clean]) {
      return this.jaCardDict[clean];
    }
    return clean;
  }

  /**
   * 一键注音核心入口
   * @param {string} rawName 当前卡名
   * @param {string} rawRuby 当前独立注音（可选）
   * @returns {string} 注入 LD 制卡器标准 `[漢字(ルビ)]` 语法的日文卡名
   */
  injectFurigana(rawName, rawRuby = '') {
    let name = String(rawName || '').trim();
    let ruby = String(rawRuby || '').trim();

    if (!name) return '';

    // 1. 如果已经包含标准 `[Base(Ruby)]` 注音，无需重复注入
    if (/\[.*?[\(（].*?[\)）]\]/.test(name)) {
      return name;
    }

    // 2. 如果存在外部注音 rawRuby，优先进行两段智能拆分对齐
    if (ruby) {
      if (name.includes('の') && ruby.includes('・')) {
        const nameParts = name.split('の');
        const rubyParts = ruby.split('・');
        if (nameParts.length === 2 && rubyParts.length === 2) {
          return `[${nameParts[0]}(${rubyParts[0]})]の[${nameParts[1]}(${rubyParts[1]})]`;
        }
      }
      return `[${name}(${ruby})]`;
    }

    // 3. 官方精准卡名库直接匹配 (精确中日卡名)
    if (this.EXACT_CARD_MAP[name]) {
      return this.EXACT_CARD_MAP[name];
    }

    // 4. 若传入的是中文，从全量 13,539+ 数据库查询官方日文卡名
    if (this.jaCardDict && this.jaCardDict[name]) {
      const jaName = this.jaCardDict[name];
      if (this.EXACT_CARD_MAP[jaName]) {
        return this.EXACT_CARD_MAP[jaName];
      }
      name = jaName;
    }

    // 5. 字段 / 系列词条优先匹配替换
    let workingName = name;

    for (const item of this.ARCHETYPE_RUBY_MAP) {
      if (workingName.includes(item.ja) && !workingName.includes(`[${item.ja}(`)) {
        workingName = workingName.split(item.ja).join(`[${item.ja}(${item.ruby})]`);
      } else if (item.zh && workingName.includes(item.zh) && !workingName.includes(`[${item.ja}(`)) {
        workingName = workingName.split(item.zh).join(`[${item.ja}(${item.ruby})]`);
      }
    }

    // 6. 常用汉字词组 (Compound Words) 匹配替换
    for (const item of this.KANJI_WORD_MAP) {
      if (workingName.includes(item.kanji)) {
        workingName = this.safeReplaceKanji(workingName, item.kanji, item.ruby);
      }
    }

    return workingName;
  }

  /**
   * 为日文效果文本注入振假名 (`[漢字(ルビ)]` 语法)。
   * - 已带注音的 `[...]` 区间会被跳过，避免重复
   * - 仅处理 EFFECT_TEXT_RUBY_MAP 中的常用术语，其余汉字保持原样
   * - 注意：请勿重复调用；已注入的文本会被识别并跳过
   */
  injectEffectFurigana(text) {
    let working = String(text || '');
    if (!working || !/[\u4E00-\u9FFF]/.test(working)) return working;
    for (const item of this.EFFECT_TEXT_RUBY_MAP) {
      if (working.includes(item.kanji)) {
        working = this.safeReplaceKanji(working, item.kanji, item.ruby);
      }
    }
    return working;
  }

  /**
   * 判断效果文本是否已包含注音语法
   */
  hasEffectFurigana(text) {
    return /\[[^\]]*[\(（][^\)）]*[\)）]\]/.test(String(text || ''));
  }

  /**
   * 安全替换未注音的汉字词组，避开已加注音的中括号区间 `[...]`
   */
  safeReplaceKanji(text, kanji, ruby) {
    const parts = [];
    const regex = /\[(.*?)[\(（].*?[\)）]\]|([^\[]+)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match[1] !== undefined) {
        parts.push(match[0]);
      } else if (match[2]) {
        const replaced = match[2].split(kanji).join(`[${kanji}(${ruby})]`);
        parts.push(replaced);
      }
    }
    return parts.length > 0 ? parts.join('') : text;
  }
}

// 挂载至全局对象，兼容浏览器与 Node 测试环境
if (typeof window !== 'undefined') {
  window.FuriganaService = FuriganaService;
  window.furiganaService = new FuriganaService();
}
if (typeof globalThis !== 'undefined') {
  globalThis.FuriganaService = FuriganaService;
  globalThis.furiganaService = new FuriganaService();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FuriganaService;
}
