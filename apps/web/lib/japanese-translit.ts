// @ts-nocheck
/**
 * Japanese to Romaji & Korean Transliteration Engine for BeatSync
 * Handles:
 * 1) Kana (Hiragana & Katakana) algorithmic conversion to Romaji & Korean Hangul pronunciation
 * 2) Bidirectional dictionary for popular J-Pop, Anime, Vocaloid & VTuber artists and song titles
 */

const KANA_MAP = {
  // Compound / Contracted (Yoon)
  'きゃ': ['kya', '캬'], 'キャ': ['kya', '캬'],
  'きゅ': ['kyu', '큐'], 'キュ': ['kyu', '큐'],
  'きょ': ['kyo', '쿄'], 'キョ': ['kyo', '쿄'],
  'しゃ': ['sha', '샤'], 'シャ': ['sha', '샤'],
  'しゅ': ['shu', '슈'], 'シュ': ['shu', '슈'],
  'しょ': ['sho', '쇼'], 'ショ': ['sho', '쇼'],
  'ちゃ': ['cha', '차'], 'チャ': ['cha', '차'],
  'ちゅ': ['chu', '추'], 'チュ': ['chu', '추'],
  'ちょ': ['cho', '초'], 'チョ': ['cho', '초'],
  'にゃ': ['nya', '냐'], 'ニャ': ['nya', '냐'],
  'にゅ': ['nyu', '뉴'], 'ニュ': ['nyu', '뉴'],
  'にょ': ['nyo', '뇨'], 'ニョ': ['nyo', '뇨'],
  'ひゃ': ['hya', '햐'], 'ヒャ': ['hya', '햐'],
  'ひゅ': ['hyu', '휴'], 'ヒュ': ['hyu', '휴'],
  'ひょ': ['hyo', '효'], 'ヒョ': ['hyo', '효'],
  'みゃ': ['mya', '먀'], 'ミャ': ['mya', '먀'],
  'みゅ': ['myu', '뮤'], 'ミュ': ['myu', '뮤'],
  'みょ': ['myo', '묘'], 'ミョ': ['myo', '묘'],
  'りゃ': ['rya', '랴'], 'リャ': ['rya', '랴'],
  'りゅ': ['ryu', '류'], 'リュ': ['ryu', '류'],
  'りょ': ['ryo', '료'], 'リョ': ['ryo', '료'],
  'ぎゃ': ['gya', '갸'], 'ギャ': ['gya', '갸'],
  'ぎゅ': ['gyu', '규'], 'ギュ': ['gyu', '규'],
  'ぎょ': ['gyo', '교'], 'ギョ': ['gyo', '교'],
  'じゃ': ['ja', '자'], 'ジャ': ['ja', '자'],
  'じゅ': ['ju', '주'], 'ジュ': ['ju', '주'],
  'じょ': ['jo', '조'], 'ジョ': ['jo', '조'],
  'びゃ': ['bya', '뱌'], 'ビャ': ['bya', '뱌'],
  'びゅ': ['byu', '뷰'], 'ビュ': ['byu', '뷰'],
  'びょ': ['byo', '뵤'], 'ビョ': ['byo', '뵤'],
  'ぴゃ': ['pya', '퍄'], 'ピャ': ['pya', '퍄'],
  'ぴゅ': ['pyu', '퓨'], 'ピュ': ['pyu', '퓨'],
  'ぴょ': ['pyo', '표'], 'ピョ': ['pyo', '표'],
  'ふぁ': ['fa', '파'], 'ファ': ['fa', '파'],
  'ふぃ': ['fi', '피'], 'フィ': ['fi', '피'],
  'ふぇ': ['fe', '페'], 'フェ': ['fe', '페'],
  'ふぉ': ['fo', '포'], 'フォ': ['fo', '포'],
  'てぃ': ['ti', '티'], 'ティ': ['ti', '티'],
  'でぃ': ['di', '디'], 'ディ': ['di', '디'],
  'うぃ': ['wi', '위'], 'ウィ': ['wi', '위'],
  'うぇ': ['we', '웨'], 'ウェ': ['we', '웨'],
  'うぉ': ['wo', '워'], 'ウォ': ['wo', '워'],
  'じぇ': ['je', '제'], 'ジェ': ['je', '제'],
  'ちぇ': ['che', '체'], 'チェ': ['che', '체'],
  'しぇ': ['she', '셰'], 'シェ': ['she', '셰'],

  // Basic Gojuon
  'あ': ['a', '아'], 'ア': ['a', '아'],
  'い': ['i', '이'], 'イ': ['i', '이'],
  'う': ['u', '우'], 'ウ': ['u', '우'],
  'え': ['e', '에'], 'エ': ['e', '에'],
  'お': ['o', '오'], 'オ': ['o', '오'],
  'か': ['ka', '카'], 'カ': ['ka', '카'],
  'き': ['ki', '키'], 'キ': ['ki', '키'],
  'く': ['ku', '쿠'], 'ク': ['ku', '쿠'],
  'け': ['ke', '케'], 'ケ': ['ke', '케'],
  'こ': ['ko', '코'], 'コ': ['ko', '코'],
  'さ': ['sa', '사'], 'サ': ['sa', '사'],
  'し': ['shi', '시'], 'シ': ['shi', '시'],
  'す': ['su', '스'], 'ス': ['su', '스'],
  'せ': ['se', '세'], 'セ': ['se', '세'],
  'そ': ['so', '소'], 'ソ': ['so', '소'],
  'た': ['ta', '타'], 'タ': ['ta', '타'],
  'ち': ['chi', '치'], 'チ': ['chi', '치'],
  'つ': ['tsu', '츠'], 'ツ': ['tsu', '츠'],
  'て': ['te', '테'], 'テ': ['te', '테'],
  'と': ['to', '토'], 'ト': ['to', '토'],
  'な': ['na', '나'], 'ナ': ['na', '나'],
  'に': ['ni', '니'], 'ニ': ['ni', '니'],
  'ぬ': ['nu', '누'], 'ヌ': ['nu', '누'],
  'ね': ['ne', '네'], 'ネ': ['ne', '네'],
  'の': ['no', '노'], 'ノ': ['no', '노'],
  'は': ['ha', '하'], 'ハ': ['ha', '하'],
  'ひ': ['hi', '히'], 'ヒ': ['hi', '히'],
  'ふ': ['fu', '후'], 'フ': ['fu', '후'],
  'へ': ['he', '헤'], 'ヘ': ['he', '헤'],
  'ほ': ['ho', '호'], 'ホ': ['ho', '호'],
  'ま': ['ma', '마'], 'マ': ['ma', '마'],
  'み': ['mi', '미'], 'ミ': ['mi', '미'],
  'む': ['mu', '무'], 'ム': ['mu', '무'],
  'め': ['me', '메'], 'メ': ['me', '메'],
  'も': ['mo', '모'], 'モ': ['mo', '모'],
  'や': ['ya', '야'], 'ヤ': ['ya', '야'],
  'ゆ': ['yu', '유'], 'ユ': ['yu', '유'],
  'よ': ['yo', '요'], 'ヨ': ['yo', '요'],
  'ら': ['ra', '라'], 'ラ': ['ra', '라'],
  'り': ['ri', '리'], 'リ': ['ri', '리'],
  'る': ['ru', '루'], 'ル': ['ru', '루'],
  'れ': ['re', '레'], 'レ': ['re', '레'],
  'ろ': ['ro', '로'], 'ロ': ['ro', '로'],
  'わ': ['wa', '와'], 'ワ': ['wa', '와'],
  'を': ['o', '오'], 'ヲ': ['o', '오'],
  'ん': ['n', 'ㄴ'], 'ン': ['n', 'ㄴ'],

  // Voiced (Dakuon)
  'が': ['ga', '가'], 'ガ': ['ga', '가'],
  'ぎ': ['gi', '기'], 'ギ': ['gi', '기'],
  'ぐ': ['gu', '구'], 'グ': ['gu', '구'],
  'げ': ['ge', '게'], 'ゲ': ['ge', '게'],
  'ご': ['go', '고'], 'ゴ': ['go', '고'],
  'ざ': ['za', '자'], 'ザ': ['za', '자'],
  'じ': ['ji', '지'], 'ジ': ['ji', '지'],
  'ず': ['zu', '즈'], 'ズ': ['zu', '즈'],
  'ぜ': ['ze', '제'], 'ゼ': ['ze', '제'],
  'ぞ': ['zo', '조'], 'ゾ': ['zo', '조'],
  'だ': ['da', '다'], 'ダ': ['da', '다'],
  'ぢ': ['ji', '지'], 'ヂ': ['ji', '지'],
  'づ': ['zu', '즈'], 'ヅ': ['zu', '즈'],
  'で': ['de', '데'], 'デ': ['de', '데'],
  'ど': ['do', '도'], 'ド': ['do', '도'],
  'ば': ['ba', '바'], 'バ': ['ba', '바'],
  'び': ['bi', '비'], 'ビ': ['bi', '비'],
  'ぶ': ['bu', '부'], 'ブ': ['bu', '부'],
  'べ': ['be', '베'], 'ベ': ['be', '베'],
  'ぼ': ['bo', '보'], 'ボ': ['bo', '보'],

  // Semi-voiced (Handakuon)
  'ぱ': ['pa', '파'], 'パ': ['pa', '파'],
  'ぴ': ['pi', '피'], 'ピ': ['pi', '피'],
  'ぷ': ['pu', '푸'], 'プ': ['pu', '푸'],
  'ぺ': ['pe', '페'], 'ペ': ['pe', '페'],
  'ぽ': ['po', '포'], 'ポ': ['po', '포'],
  'ヴ': ['vu', '브'],

  // Small vowels
  'ぁ': ['a', '아'], 'ァ': ['a', '아'],
  'ぃ': ['i', '이'], 'ィ': ['i', '이'],
  'ぅ': ['u', '우'], 'ゥ': ['u', '우'],
  'ぇ': ['e', '에'], 'ェ': ['e', '에'],
  'ぉ': ['o', '오'], 'ォ': ['o', '오'],
};

function attachHangulBatchim(korStr, jongseongOffset) {
  if (!korStr) return '';
  const lastCode = korStr.charCodeAt(korStr.length - 1);
  if (lastCode >= 0xAC00 && lastCode <= 0xD7A3 && (lastCode - 0xAC00) % 28 === 0) {
    return korStr.slice(0, -1) + String.fromCharCode(lastCode + jongseongOffset);
  }
  return korStr;
}

/**
 * Algorithmic Kana to Romaji and Korean Hangul conversion
 */
export function kanaToRomajiAndKorean(str) {
  if (!str || typeof str !== 'string') return { romaji: '', korean: '', koreanVariants: [] };
  let romaji = '';
  let koreanN = '';
  let koreanNg = '';
  let koreanNoSokuon = '';
  let i = 0;

  while (i < str.length) {
    const ch = str[i];
    // Chouonpu (ー): long vowel
    if (ch === 'ー') {
      i++;
      continue;
    }
    // Sokuon (っ / ッ): double consonant / 받침 ㅅ (jongseong offset 19)
    if (ch === 'っ' || ch === 'ッ') {
      const nextPair = str.slice(i + 1, i + 3);
      const nextChar = str[i + 1];
      const match = KANA_MAP[nextPair] || KANA_MAP[nextChar];
      if (match) {
        romaji += match[0][0];
      }
      koreanN = attachHangulBatchim(koreanN, 19);
      koreanNg = attachHangulBatchim(koreanNg, 19);
      i++;
      continue;
    }
    // Moraic nasal (ん / ン): attach 받침 ㄴ(4), ㅁ(16 before b/p/m), or ㅇ(21)
    if (ch === 'ん' || ch === 'ン') {
      const nextPair = str.slice(i + 1, i + 3);
      const nextChar = str[i + 1];
      const nextMatch = KANA_MAP[nextPair] || KANA_MAP[nextChar];
      const nextRom = nextMatch ? nextMatch[0] : '';
      const isLabial = /^[bmp]/.test(nextRom);
      const isVelarOrEnd = !nextRom || /^[kg]/.test(nextRom);
      romaji += isLabial ? 'm' : 'n';
      koreanN = attachHangulBatchim(koreanN, isLabial ? 16 : 4);
      koreanNg = attachHangulBatchim(koreanNg, isVelarOrEnd ? 21 : (isLabial ? 16 : 4));
      koreanNoSokuon = attachHangulBatchim(koreanNoSokuon, isLabial ? 16 : 4);
      i++;
      continue;
    }
    const pair = str.slice(i, i + 2);
    if (KANA_MAP[pair]) {
      romaji += KANA_MAP[pair][0];
      koreanN += KANA_MAP[pair][1];
      koreanNg += KANA_MAP[pair][1];
      koreanNoSokuon += KANA_MAP[pair][1];
      i += 2;
      continue;
    }
    if (KANA_MAP[ch]) {
      romaji += KANA_MAP[ch][0];
      koreanN += KANA_MAP[ch][1];
      koreanNg += KANA_MAP[ch][1];
      koreanNoSokuon += KANA_MAP[ch][1];
      i += 1;
      continue;
    }
    romaji += ch;
    koreanN += ch;
    koreanNg += ch;
    koreanNoSokuon += ch;
    i++;
  }

  const variants = [...new Set([koreanN.trim(), koreanNg.trim(), koreanNoSokuon.trim()].filter(Boolean))];
  return { romaji: romaji.trim(), korean: koreanN.trim(), koreanVariants: variants };
}

/**
 * Curated Japanese Song & Artist Dictionary
 * Maps Kanji/Kana/Romaji/Hangul bi-directionally
 */
export const JAPANESE_DICTIONARY: Record<string, string[]> = {
  // --- Artists: J-Pop / Rock / Solo ---
  '音乃瀬奏': ['오토노세 카나데', '오토노세카나데', 'Otonose Kanade', 'Kanade Otonose', '카나데', 'kanade'],
  '米津玄師': ['요네즈 켄시', '요네즈 겐시', '요네즈켄시', '요네즈겐시', 'Kenshi Yonezu', 'Yonezu Kenshi', '켄시', '겐시', 'kenshi'],
  'YOASOBI': ['요아소비', 'yoasobi'],
  'Ayase': ['아야세', 'ayase'],
  'ikura': ['이쿠라', '이쿠타 리라', '리라', 'ikura'],
  'Ado': ['아도', 'ado'],
  'あいみょん': ['아이묭', '아이묜', 'aimyon', 'Aimyon'],
  'Aimyon': ['아이묭', '아이묜', 'あいみょん', 'aimyon'],
  'Vaundy': ['바운디', 'vaundy'],
  '優里': ['유우리', '유리', 'Yuuri', 'Yuri', 'yuuri'],
  'Yuuri': ['유우리', '유리', '優里', 'yuuri'],
  'Official髭男dism': ['오피셜 히게단디즘', '오피셜히게단디즘', '히게단디즘', '히게단', 'Official Hige Dandism', 'Official HIGE DANdism', 'Hige Dandism', 'Higedan'],
  'Official HIGE DANdism': ['오피셜 히게단디즘', '오피셜히게단디즘', '히게단디즘', '히게단', 'Official髭男dism'],
  'King Gnu': ['킹 누', '킹누', 'king gnu'],
  'RADWIMPS': ['래드윔프스', '라드윔프스', '레드윔프스', 'radwimps'],
  'back number': ['백 넘버', '백넘버', 'back number'],
  'SPYAIR': ['스파이에어', '스파이 에어', 'spyair'],
  'LiSA': ['리사', 'lisa'],
  'Aimer': ['에메', '에이머', 'aimer'],
  'ヨルシカ': ['요루시카', 'yorushika', 'Yorushika'],
  'Yorushika': ['요루시카', 'ヨルシカ', 'yorushika'],
  'n-buna': ['나부나', 'nbuna'],
  'suis': ['스이', 'suis'],
  'ずっと真夜中でいいのに。': ['즛토마요', '즈토마요', '즛토 마요나카데 이이노니', '계속 한밤중이면 좋을 텐데', 'ZUTOMAYO', 'Zutto Mayonaka de Iinoni'],
  'ZUTOMAYO': ['즛토마요', '즈토마요', '즛토 마요나카데 이이노니', 'ずっと真夜中でいいのに。'],
  'Eve': ['이브', 'eve'],
  '星野源': ['호시노 겐', '호시노 켄', '호시노겐', 'Hoshino Gen', 'Gen Hoshino', '겐', 'gen'],
  '宇多田ヒカル': ['우타다 히카루', '우타다히카루', 'Utada Hikaru', 'Hikaru Utada', '히카루', 'hikaru'],
  '藤井風': ['후지이 카제', '후지이 가제', '후지이카제', '후지이가제', 'Fujii Kaze', 'Kaze Fujii', '카제', '가제', 'kaze'],
  '藤井 風': ['후지이 카제', '후지이 가제', '후지이카제', 'Fujii Kaze', 'Kaze Fujii', '카제', 'kaze'],
  '緑黄色社会': ['료쿠오우쇼쿠 샤카이', '녹황색사회', '료쿠샤카', 'Ryokuoushoku Shakai', 'Ryokushaka'],
  'BUMP OF CHICKEN': ['범프 오브 치킨', '범프오브치킨', '범프', 'bump of chicken'],
  'ONE OK ROCK': ['원 오크 록', '원오크록', '원 오크 락', '원오크락', '원옥락', 'one ok rock'],
  'milet': ['밀레', '미레이', '미레', 'milet'],
  'tuki.': ['츠키', '투키', '쓰키', 'tuki'],
  'Creepy Nuts': ['크리피 너츠', '크리피너츠', '크리피 넛츠', 'creepy nuts'],
  'Mrs. GREEN APPLE': ['미세스 그린 애플', '미세스그린애플', '미세스', 'mrs green apple', 'mrs. green apple'],
  'SEKAI NO OWARI': ['세카이 노 오와리', '세카이노 오와리', '세카이노오와리', '세카오와', '엔드 오브 더 월드', 'End of the World', 'sekai no owari'],
  'TK from 凛として時雨': ['TK from 린토시테 시구레', '린토시테 시구레', '린토시테시구레', '티케이', 'TK', 'TK from Ling tosite sigure'],
  '凛として時雨': ['린토시테 시구레', '린토시테시구레', 'Ling Tosite Sigure', 'Ling tosite sigure'],
  'ASIAN KUNG-FU GENERATION': ['아시안 쿵푸 제너레이션', '아시안쿵푸제너레이션', '아지캉', '아지칸', 'asian kung-fu generation'],
  'DAOKO': ['다오코', 'daoko'],
  'MAN WITH A MISSION': ['맨 위드 어 미션', '맨위드어미션', 'man with a mission'],
  'amazarashi': ['아마자라시', 'amazarashi'],
  'さユり': ['사유리', '산케츠 쇼죠 사유리', 'Sayuri', 'sayuri'],
  '美波': ['미나미', 'Minami', 'minami'],
  'KANA-BOON': ['카나분', '가나분', 'kana boon', 'kanaboon'],
  'ano': ['아노', 'あの', 'ano'],
  'あの': ['아노', 'ano'],
  '新しい学校のリーダーズ': ['아타라시이 각코', '아타라시이각코', '새로운 학교의 리더즈', '아타라시이 각코노 리더즈', 'Atarashii Gakko', 'ATARASHII GAKKO!'],
  'ATARASHII GAKKO!': ['아타라시이 각코', '아타라시이각코', '새로운 학교의 리더즈', '新しい学校のリーダーズ'],
  'UNISON SQUARE GARDEN': ['유니즌 스퀘어 가든', '유니즌스퀘어가든', '유니즌', 'Unison Square Garden'],
  'Superfly': ['슈퍼플라이', 'superfly'],
  '中島美嘉': ['나카시마 미카', '나카지마 미카', '나카시마미카', '나카지마미카', 'Nakashima Mika', 'Mika Nakashima', '미카'],
  '平井堅': ['히라이 켄', '히라이 겐', '히라이켄', 'Ken Hirai', 'Hirai Ken', '켄'],
  '平井大': ['히라이 다이', '히라이다이', 'Dai Hirai', 'Hirai Dai', '다이'],
  '清水翔太': ['시미즈 쇼타', '시미즈쇼타', 'Shota Shimizu', 'Shimizu Shota', '쇼타'],
  '山下達郎': ['야마시타 타츠로', '야마시타 다쓰로', '야마시타타츠로', 'Tatsuro Yamashita', 'Yamashita Tatsuro', '타츠로'],
  '竹内まりや': ['타케우치 마리야', '다케우치 마리야', '타케우치마리야', 'Mariya Takeuchi', 'Takeuchi Mariya', '마리야'],
  '松原みき': ['마츠바라 미키', '마쓰바라 미키', '마츠바라미키', 'Miki Matsubara', 'Matsubara Miki', '미키'],
  '大貫妙子': ['오오누키 타에코', '오누키 타에코', 'Taeko Onuki', 'Onuki Taeko'],
  '杏里': ['안리', 'Anri', 'anri'],
  '泰葉': ['야스하', 'Yasuha', 'yasuha'],
  '大橋純子': ['오오하시 준코', '오하시 준코', 'Junko Ohashi'],
  'wacci': ['왓치', 'wacci'],
  'Saucy Dog': ['소시 도그', '소시독', '사우시 독', '사우시독', 'Saucy Dog'],
  'マカロニえんぴつ': ['마카로니 엔피츠', '마카로니엔피츠', '마카로니 연필', 'Macaroni Empitsu', 'Macaroni Enpitsu'],
  'sumika': ['스미카', 'sumika'],
  'DISH//': ['디시', '디쉬', 'dish'],
  'Novelbright': ['노벨브라이트', ' 노벨 브라이트', 'novelbright'],
  'Omoinotake': ['오모이노타케', 'omoinotake'],
  'Da-iCE': ['다이스', 'da-ice', 'daice'],
  'Snow Man': ['스노우맨', '스노맨', 'snow man'],
  'SixTONES': ['식스톤즈', '스톤즈', 'sixtones'],
  'なにわ男子': ['나니와단시', '나니와 단시', 'Naniwa Danshi'],
  'King & Prince': ['킹 앤 프린스', '킹앤프린스', '킨프리', 'king and prince'],
  'Hey! Say! JUMP': ['헤이 세이 점프', '헤이세이점프', 'hey say jump'],
  'KinKi Kids': ['킨키 키즈', '킨키키즈', 'kinki kids'],
  '嵐': ['아라시', 'Arashi', 'arashi'],
  'SMAP': ['스맙', 'smap'],
  'TOKIO': ['토키오', '도키오', 'tokio'],
  'V6': ['브이식스', 'v6'],
  'X JAPAN': ['엑스 재팬', '엑스재팬', 'x japan'],
  'L\'Arc~en~Ciel': ['라르크 앙 시엘', '라르크앙시엘', '라르크', 'larc en ciel', 'L\'Arc-en-Ciel'],
  'HYDE': ['하이드', 'hyde'],
  'GLAY': ['글레이', 'glay'],
  'B\'z': ['비즈', 'bz'],
  'Mr.Children': ['미스터 칠드런', '미스터칠드런', '미스치루', 'mr children', 'mr.children'],
  'サザンオールスターズ': ['사잔 올 스타즈', '사잔올스타즈', '서던 올 스타즈', 'Southern All Stars'],
  '桑田佳祐': ['쿠와타 케이스케', '구와타 게이스케', 'Keisuke Kuwata'],
  '安全地帯': ['안전지대', '안젠치타이', 'Anzen Chitai'],
  '玉置浩二': ['타마키 코지', '다마키 고지', 'Koji Tamaki', 'Tamaki Koji'],
  '小田和正': ['오다 카즈마사', '오다 가즈마사', 'Kazumasa Oda'],
  '徳永英明': ['토쿠나가 히데아키', '도쿠나가 히데아키', 'Hideaki Tokunaga'],
  'ZARD': ['자드', 'zard'],
  'WANDS': ['완즈', 'wands'],
  'DEEN': ['딘', 'deen'],
  '大黒摩季': ['오오구로 마키', '오구로 마키', 'Maki Ohguro'],
  'ポルノグラフィティ': ['포르노 그래피티', '포르노그래피티', '포르노그라피티', 'Porno Graffitti'],
  'スキマスイッチ': ['스키마 스위치', '스키마스위치', 'Sukima Switch'],
  'コブクロ': ['코부쿠로', '고부쿠로', 'Kobukuro'],
  'ゆず': ['유즈', 'Yuzu', 'yuzu'],
  'いきものがかり': ['이키모노가카리', 'Ikimonogakari'],
  'GReeeeN': ['그린', 'GRe4N BOYZ', 'greeeen'],
  'GRe4N BOYZ': ['그린', '그린 보이즈', 'GReeeeN', 'gre4n boyz'],
  'レミオロメン': ['레미오로멘', 'Remioromen'],
  'Aqua Timez': ['아쿠아 타임즈', '아쿠아타임즈', 'aqua timez'],
  '湘南乃風': ['쇼난노카제', 'Shonan no Kaze'],
  'ORANGE RANGE': ['오렌지 렌지', '오렌지 레인지', '오렌지렌지', 'orange range'],
  '椎名林檎': ['시이나 링고', '시나 링고', '시이나링고', 'Sheena Ringo', 'Ringo Sheena', '링고', 'ringo'],
  '東京事変': ['도쿄사변', '동경사변', '도쿄지헨', 'Tokyo Jihen', 'Tokyo Incidents'],
  '菅田将暉': ['스다 마사키', '스다마사키', 'Masaki Suda', 'Suda Masaki', '마사키', 'masaki'],
  '羊文学': ['양문학', '히츠지분가쿠', '히쓰지분가쿠', 'Hitsujibungaku'],
  'スピッツ': ['스피츠', 'Spitz', 'spitz'],
  'サカナクション': ['사카낙션', 'Sakanaction', 'sakanaction'],
  'キタニタツヤ': ['키타니 타츠야', '기타니 다쓰야', '키타니 다쓰야', '키타니타츠야', 'Tatsuya Kitani', 'Kitani Tatsuya', '타츠야', 'tatsuya'],
  'なとり': ['나토리', 'natori', 'Natori'],
  'imase': ['이마세', 'imase'],
  'yama': ['야마', 'yama'],
  'Tani Yuuki': ['타니 유우키', '타니 유키', '다니 유키', '타니유우키', 'tani yuuki'],
  '川崎鷹也': ['카와사키 타카야', '가와사키 다카야', '카와사키타카야', 'Takaya Kawasaki'],
  '瑛人': ['에이토', 'Eito', 'eito'],
  'もさを。': ['모사오', 'Mosawo', 'mosawo'],
  'りりあ。': ['리리아', 'Riria', 'riria'],
  'コレサワ': ['코레사와', 'Koresawa', 'koresawa'],
  'ちゃんみな': ['챤미나', '찬미나', 'CHANMINA', 'chanmina'],
  'CHANMINA': ['챤미나', '찬미나', 'ちゃんみな', 'chanmina'],
  'あたらよ': ['아타라요', 'Atarayo', 'atarayo'],
  'マルシィ': ['마르시', 'Marcy', 'marcy'],
  'ねぐせ。': ['네구세', 'Neguse', 'neguse'],
  'ヤングスキニー': ['영 스키니', '양 스키니', 'Yang Skinny'],
  'Chilli Beans.': ['칠리 빈즈', '칠리빈즈', 'chilli beans'],
  'SHISHAMO': ['시샤모', 'shishamo'],
  'SCANDAL': ['스캔들', 'scandal'],
  'SILENT SIREN': ['사일런트 사이렌', 'silent siren'],
  'BLUE ENCOUNT': ['블루 엔카운트', '블루엔카운트', 'blue encount'],
  'THE ORAL CIGARETTES': ['더 오랄 시가렛츠', '오랄 시가렛츠', '오랄시가렛츠', 'the oral cigarettes'],
  '04 Limited Sazabys': ['포 리미티드 사자비즈', '포리미', '04 limited sazabys'],
  'フレデリック': ['프레데릭', 'Frederic', 'frederic'],
  'クリープハイプ': ['크리프하이프', 'CreepHyp'],
  'ゲスの極み乙女': ['게스노 키와미 오토메', '게스 오토메', 'Gesu no Kiwami Otome'],
  'indigo la End': ['인디고 라 엔드', '인디고라엔드', 'indigo la end'],
  'My Hair is Bad': ['마이 헤어 이즈 배드', '마이헤어이즈배드', 'my hair is bad'],
  'SUPER BEAVER': ['슈퍼 비버', '슈퍼비버', 'super beaver'],
  'WANIMA': ['와니마', 'wanima'],
  '10-FEET': ['텐피트', '10피트', '10-feet', '10feet'],
  'ELLEGARDEN': ['엘르가든', '엘레가든', 'ellegarden'],
  'マキシマム ザ ホルモン': ['맥시멈 더 호르몬', '맥시멈더호르몬', 'Maximum the Hormone'],
  'coldrain': ['콜드레인', 'coldrain'],
  '[Alexandros]': ['알렉산드로스', 'Alexandros', 'alexandros'],
  'DOES': ['더즈', '도즈', 'does'],
  'flumpool': ['플럼풀', 'flumpool'],
  'MAISONdes': ['메종데', 'maisondes'],
  '女王蜂': ['여왕벌', '죠오바치', '조오바치', '퀸비', 'Queen Bee', 'Ziyoou-vachi'],
  'GEMN': ['젬', 'gemn'],
  'B小町': ['B코마치', '비코마치', 'B-Komachi', 'b komachi'],
  'トゲナシトゲアリ': ['토게나시 토게아리', '토게토게', 'Togenashi Togeari'],
  'Linked Horizon': ['링크드 호라이즌', 'linked horizon'],
  'SiM': ['심', 'sim'],
  '神聖かまってちゃん': ['신세이 카맛테짱', '신성 카맛테짱', 'Shinsei Kamattechan'],
  'ヒグチアイ': ['히구치 아이', '히구치아이', 'Ai Higuchi', 'Higuchi Ai'],
  'UVERworld': ['우버월드', '우버 월드', 'uverworld'],
  'supercell': ['슈퍼셀', 'supercell'],
  'EGOIST': ['에고이스트', 'egoist'],
  'HoneyWorks': ['허니웍스', 'honeyworks'],
  'CHiCO with HoneyWorks': ['치코 위드 허니웍스', '치코', ' 허니웍스', 'chico with honeyworks'],
  'Galileo Galilei': ['갈릴레오 갈릴레이', 'galileo galilei'],
  'Goose house': ['구스 하우스', '구스하우스', 'goose house'],
  '鈴木雅之': ['스즈키 마사유키', '스즈키마사유키', 'Masayuki Suzuki', 'Suzuki Masayuki'],
  'オーイシマサヨシ': ['오이시 마사요시', '오오이시 마사요시', '오이시마사요시', 'Masayoshi Oishi', 'Oishi Masayoshi'],
  '大石昌良': ['오이시 마사요시', '오오이시 마사요시', '오이시마사요시', 'Masayoshi Oishi', 'Oishi Masayoshi'],
  'MYTH & ROID': ['미스 앤 로이드', '미스앤로이드', 'myth and roid'],
  'OxT': ['옥트', 'oxt'],
  'ReoNa': ['레오나', 'reona'],
  '藍井エイル': ['아오이 에일', '아오이에일', 'Eir Aoi', 'Aoi Eir'],
  '春奈るな': ['하루나 루나', '하루나루나', 'Luna Haruna', 'Haruna Luna'],
  'GARNiDELiA': ['가르니델리아', 'garnidelia'],
  'Uru': ['우루', 'uru'],
  '家入レオ': ['이에이리 레오', '이에이리레오', 'Leo Ieiri', 'Ieiri Leo'],
  '大原櫻子': ['오오하라 사쿠라코', '오하라 사쿠라코', 'Sakurako Ohara'],
  'YUI': ['유이', 'yui'],
  'miwa': ['미와', 'miwa'],
  'aiko': ['아이코', 'aiko'],
  '絢香': ['아야카', 'Ayaka', 'ayaka'],
  'JUJU': ['주주', '쥬쥬', 'juju'],
  '西野カナ': ['니시노 카나', '니시노 가나', '니시노카나', 'Kana Nishino', 'Nishino Kana', '카나'],
  '安室奈美恵': ['아무로 나미에', '아무로나미에', 'Namie Amuro', 'Amuro Namie', '나미에'],
  '浜崎あゆみ': ['하마사키 아유미', '하마사키아유미', 'Ayumi Hamasaki', 'Hamasaki Ayumi', '아유미'],
  '倖田來未': ['코다 쿠미', '고다 구미', '코다쿠미', 'Koda Kumi', 'Kumi Koda', '쿠미'],
  '倉木麻衣': ['쿠라키 마이', '구라키 마이', '쿠라키마이', 'Mai Kuraki', 'Kuraki Mai', '마이'],
  '中島みゆき': ['나카지마 미유키', '나카시마 미유키', '나카지마미유키', 'Miyuki Nakajima', 'Nakajima Miyuki', '미유키'],
  '松任谷由実': ['마츠토야 유미', '아라이 유미', 'Yumi Matsutoya', 'Yumi Arai'],
  '松田聖子': ['마츠다 세이코', '마쓰다 세이코', 'Seiko Matsuda'],
  '中森明菜': ['나카모리 아키나', 'Akina Nakamori'],
  '尾崎豊': ['오자키 유타카', '오자키유타카', 'Yutaka Ozaki', 'Ozaki Yutaka', '유타카'],
  '秦基博': ['하타 모토히로', '하타모토히로', 'Motohiro Hata', 'Hata Motohiro', '모토히로'],
  '三浦大知': ['미우라 다이치', '미우라다이치', 'Daichi Miura', 'Miura Daichi', '다이치'],
  '岡崎体育': ['오카자키 타이이쿠', '오카자키타이이쿠', 'Taiiku Okazaki'],
  '久石譲': ['히사이시 조', '히사이시 죠', '히사이시조', 'Joe Hisaishi', 'Hisaishi Joe'],
  '坂本龍一': ['사카모토 류이치', '사카모토류이치', 'Ryuichi Sakamoto', 'Sakamoto Ryuichi'],
  '大森元貴': ['오모리 모토키', '오오모리 모토키', '오모리모토키', 'Motoki Ohmori', 'Omori Motoki', '모토키'],
  '福山雅治': ['후쿠야마 마사하루', 'Masaharu Fukuyama'],
  '大塚愛': ['오츠카 아이', '오오츠카 아이', '오쓰카 아이', '오오쓰카 아이', '오츠카아이', '오오츠카아이', 'Ai Otsuka', 'Otsuka Ai', '아이'],
  'MONGOL800': ['몽골800', '몽골팔백', 'mongol800'],
  'サンボマスター': ['삼보마스터', '산보마스터', 'Sambomaster'],
  '和楽器バンド': ['화악기밴드', '와갓키밴드', 'Wagakki Band'],
  'BABYMETAL': ['베이비메탈', 'babymetal'],
  'Perfume': ['퍼퓸', 'perfume'],
  'AKB48': ['에이케이비48', '에이케이비포티에잇', 'akb48'],
  '乃木坂46': ['노기자카46', '노기자카', 'Nogizaka46'],
  '欅坂46': ['케야키자카46', '케야키자카', 'Keyakizaka46'],
  '櫻坂46': ['사쿠라자카46', '사쿠라자카', 'Sakurazaka46'],
  '日向坂46': ['히나타자카46', '히나타자카', 'Hinatazaka46'],
  'FRUITS ZIPPER': ['후르츠 지퍼', '프루츠 지퍼', '후르츠지퍼', 'fruits zipper'],
  'NiziU': ['니쥬', '니주', 'niziu'],
  'XG': ['엑스지', 'xg'],
  'BE:FIRST': ['비퍼스트', 'befirst', 'be:first'],
  'JO1': ['제이오원', 'jo1'],
  'INI': ['아이엔아이', 'ini'],
  'ME:I': ['미아이', 'mei', 'me:i'],
  'Number_i': ['넘버아이', 'number i', 'number_i'],
  '&TEAM': ['앤팀', '앤드팀', 'andteam', '&team'],
  'こっちのけんと': ['콧치노 켄토', '콧치노켄토', 'Kocchi no Kento', '켄토'],
  '乃紫': ['노아', 'noa'],
  '弌誠': ['잇세이', 'Issei'],

  // --- Anime / Seiyuu / Idol / Unit Artists ---
  '幾田りら': ['이쿠타 리라', '이쿠타리라', 'Ikuta Lilas', 'Lilas Ikuta', 'Lilas', 'lilas', '리라'],
  'Ikuta Lilas': ['이쿠타 리라', '이쿠타리라', '幾田りら', 'Lilas', 'lilas', '리라'],
  'Lilas Ikuta': ['이쿠타 리라', '이쿠타리라', '幾田りら', 'Lilas', 'lilas', '리라'],
  'Lilas': ['리라', 'lilas'],
  '望月杏奈': ['모치즈키 안나', '모치즈키안나', 'Mochizuki Anna', 'Anna Mochizuki', '안나', 'anna'],
  '夏川椎菜': ['나츠카와 시이나', '나쓰카와 시이나', '나츠카와 시나', '나츠카와시이나', 'Natsukawa Shiina', 'Shiina Natsukawa', '시이나', 'shiina'],
  '結束バンド': ['결속밴드', '결속 밴드', 'kessoku band', 'Kessoku Band', '케속밴드', '케소쿠 밴드', '케소쿠밴드', 'bocchi the rock', '봇치 더 록'],
  'kessoku band': ['결속밴드', '결속 밴드', '結束バンド', '케속밴드', '케소쿠 밴드', '케소쿠밴드', 'bocchi the rock', '봇치 더 록'],
  'Kessoku Band': ['결속밴드', '결속 밴드', '結束バンド', '케속밴드', '케소쿠 밴드', '케소쿠밴드', 'bocchi the rock', '봇치 더 록'],
  '後藤ひとり': ['고토 히토리', '고토히토리', 'Goto Hitori', '히토리'],
  '伊地知虹夏': ['이지치 니지카', '이지치니지카', 'Ijichi Nijika', '니지카'],
  '山田リョウ': ['야마다 료', '야마다료', 'Yamada Ryo', '료'],
  '喜多郁代': ['키타 이쿠요', '키타이쿠요', 'Kita Ikuyo', '이쿠요'],
  '青山吉能': ['아오야마 요시노', '아오야마요시노', 'Aoyama Yoshino', 'Yoshino Aoyama', '요시노'],
  '鈴代紗弓': ['스즈시로 사유미', '스즈시로사유미', 'Suzushiro Sayumi', '사유미'],
  '水野朔': ['미즈노 사쿠', '미즈노사쿠', 'Mizuno Saku', '사쿠'],
  '長谷川育美': ['하세가와 이쿠미', '하세가와이쿠미', 'Hasegawa Ikumi', '이쿠미'],
  '春日未来': ['카스가 미라이', '카스가미라이', 'Kasuga Mirai', '미라이', 'mirai'],
  '最上静香': ['모가미 시즈카', '모가미시즈카', 'Mogami Shizuka', '시즈카', 'shizuka'],
  '伊吹翼': ['이부키 츠바사', '이부키츠바사', 'Ibuki Tsubasa', '츠바사', 'tsubasa'],
  '七尾百合子': ['나나오 유리코', '나나오유리코', 'Nanao Yuriko', '유리코', 'yuriko'],
  '箱崎星梨花': ['하코자키 세리카', '하코자키세리카', 'Hakozaki Serika', '세리카', 'serika'],
  '北沢志保': ['키타자와 시호', '키타자와시호', 'Kitazawa Shiho', '시호', 'shiho'],
  '雨宮天': ['아마미야 소라', '아마미야소라', 'Amamiya Sora', 'Sora Amamiya', '소라', 'sora'],
  '麻倉もも': ['아사쿠라 모모', '아사쿠라모모', 'Asakura Momo', 'Momo Asakura', '모모', 'momo'],
  '伊藤美来': ['이토 미쿠', '이토미쿠', 'Ito Miku', 'Miku Ito', '미쿠', 'miku'],
  '水瀬いのり': ['미나세 이노리', '미나세이노리', 'Inori Minase', 'Minase Inori', '이노리', 'inori'],
  '花澤香菜': ['하나자와 카나', '하나자와 가나', '하나자와카나', 'Kana Hanazawa', 'Hanazawa Kana', '카나', 'kana'],
  '早見沙織': ['하야미 사오리', '하야미사오리', 'Saori Hayami', 'Hayami Saori', '사오리', 'saori'],
  '佐倉綾音': ['사쿠라 아야네', '사쿠라아야네', 'Ayane Sakura', 'Sakura Ayane', '아야네', 'ayane'],
  '悠木碧': ['유우키 아오이', '유키 아오이', '유우키아오이', '유키아오이', 'Aoi Yuki', 'Yuki Aoi', '아오이', 'aoi'],
  '鬼頭明里': ['키토 아카리', '기토 아카리', '키토아카리', 'Akari Kito', 'Kito Akari', '아카리', 'akari'],
  '高橋李依': ['다카하시 리에', '타카하시 리에', '다카하시리에', '타카하시리에', 'Rie Takahashi', 'Takahashi Rie', '리에', 'rie'],
  '上坂すみれ': ['우에사카 스미레', '우에사카스미레', 'Sumire Uesaka', 'Uesaka Sumire', '스미레', 'sumire'],
  '種崎敦美': ['타네자키 아츠미', '다네자키 아쓰미', '타네자키아츠미', 'Atsumi Tanezaki', '아츠미', 'atsumi'],
  '内田真礼': ['우치다 마아야', '우치다마아야', 'Maaya Uchida', 'Uchida Maaya', '마아야', 'maaya'],
  '上田麗奈': ['우에다 레이나', '우에다레이나', 'Reina Ueda', 'Ueda Reina', '레이나', 'reina'],
  '楠木ともり': ['쿠스노키 토모리', '구스노키 도모리', '쿠스노키토모리', 'Tomori Kusunoki', '토모리', 'tomori'],
  '小倉唯': ['오구라 유이', '오구라유이', 'Yui Ogura', 'Ogura Yui', '유이', 'yui'],
  '宮野真守': ['미야노 마모루', '미야노마모루', 'Mamoru Miyano', '마모루', 'mamoru'],
  '神谷浩史': ['카미야 히로시', '가미야 히로시', '카미야히로시', 'Hiroshi Kamiya', '히로시', 'hiroshi'],
  '杉田智和': ['스기타 토모카즈', '스기타 도모카즈', '스기타토모카즈', 'Tomokazu Sugita', '토모카즈', 'tomokazu'],
  '中村悠一': ['나카무라 유이치', '나카무라 유우이치', '나카무라유이치', 'Yuichi Nakamura', '유이치', 'yuichi'],
  '水樹奈々': ['미즈키 나나', '미즈키나나', 'Nana Mizuki', 'Mizuki Nana', '나나', 'nana'],
  '坂本真綾': ['사카모토 마아야', '사카모토마아야', 'Maaya Sakamoto', 'Sakamoto Maaya', '마아야', 'maaya'],
  '田村ゆかり': ['타무라 유카리', '다무라 유카리', '타무라유카리', 'Yukari Tamura', 'Tamura Yukari', '유카리'],
  '堀江由衣': ['호리에 유이', '호리에유이', 'Yui Horie', 'Horie Yui', '유이'],
  '釘宮理恵': ['쿠기미야 리에', '구기미야 리에', '쿠기미야리에', 'Rie Kugimiya', 'Kugimiya Rie', '리에'],
  '戸松遥': ['토마츠 하루카', '도마쓰 하루카', '토마츠하루카', 'Haruka Tomatsu', 'Tomatsu Haruka', '하루카'],
  '竹達彩奈': ['타케타츠 아야나', '다케타쓰 아야나', '타케타츠아야나', 'Ayana Taketatsu', 'Taketatsu Ayana', '아야나'],
  '日笠陽子': ['히카사 요코', '히카사요코', 'Yoko Hikasa', 'Hikasa Yoko', '요코'],
  '豊崎愛生': ['토요사키 아키', '도요사키 아키', '토요사키아키', 'Aki Toyosaki', 'Toyosaki Aki', '아키'],
  '寿美菜子': ['코토부키 미나코', '고토부키 미나코', 'Minako Kotobuki', '미나코'],
  '佐藤聡美': ['사토 사토미', 'Satomi Sato', '사토미'],
  '平野綾': ['히라노 아야', '히라노아야', 'Aya Hirano', 'Hirano Aya', '아야'],
  '茅原実里': ['치하라 미노리', '치하라미노리', 'Minori Chihara', 'Chihara Minori', '미노리'],
  '東山奈央': ['토우야마 나오', '토야마 나오', '도야마 나오', 'Nao Toyama', 'Toyama Nao', '나오'],
  '古賀葵': ['코가 아오이', '고가 아오이', 'Aoi Koga', 'Koga Aoi', '아오이'],
  '小原好美': ['코하라 코노미', '고하라 고노미', 'Konomi Kohara', 'Kohara Konomi', '코노미'],
  '本渡楓': ['혼도 카에데', '혼도 가에데', 'Kaede Hondo', 'Hondo Kaede', '카에데'],
  'ファイルーズあい': ['파이루즈 아이', 'Fairouz Ai', '아이'],
  '石見舞菜香': ['이와미 마나카', 'Manaka Iwami', 'Iwami Manaka', '마나카'],
  '羊宮妃那': ['요우미야 히나', '요미야 히나', 'Hina Yomiya', 'Yomiya Hina', '히나'],
  '伊駒ゆりえ': ['이코마 유리에', 'Yurie Igoma', 'Igoma Yurie', '유리에'],
  '潘めぐみ': ['한 메구미', 'Megumi Han', 'Han Megumi', '메구미'],
  '大久保瑠美': ['오오쿠보 루미', '오쿠보 루미', 'Rumi Okubo', 'Okubo Rumi', '루미'],
  '南條愛乃': ['난죠 요시노', '난조 요시노', 'Yoshino Nanjo', 'Nanjo Yoshino', '요시노'],
  '三森すずこ': ['미모리 스즈코', 'Suzuko Mimori', 'Mimori Suzuko', '스즈코'],
  '内田彩': ['우치다 아야', 'Aya Uchida', 'Uchida Aya', '아야'],
  '梶浦由記': ['카지우라 유키', '가지우라 유키', '카지우라유키', 'Yuki Kajiura'],
  '澤野弘之': ['사와노 히로유키', '사와노히로유키', 'Hiroyuki Sawano', 'SawanoHiroyuki[nZk]'],
  'SawanoHiroyuki[nZk]': ['사와노 히로유키', '사와노히로유키', 'Hiroyuki Sawano', '澤野弘之'],
  '島村卯月': ['시마무라 우즈키', '시마무라우즈키', 'Shimamura Uzuki', '우즈키'],
  '渋谷凛': ['시부야 린', '시부야린', 'Shibuya Rin', '린'],
  '本田未央': ['혼다 미오', '혼다미오', 'Honda Mio', '미오'],
  '天海春香': ['아마미 하루카', '아마미하루카', 'Amami Haruka', '하루카'],
  '如月千早': ['키사라기 치하야', '키사라기치하야', 'Kisaragi Chihaya', '치하야'],
  '星井美希': ['호시이 미키', '호시이미키', 'Hoshii Miki', '미키'],
  '高垣楓': ['타카가키 카에데', '다카가키 가에데', '타카가키카에데', 'Takagaki Kaede', '카에데'],
  '神崎蘭子': ['칸자키 란코', '간자키 란코', '칸자키란코', 'Kanzaki Ranko', '란코'],
  '初星学園': ['하츠보시 학원', '초성학원', '학마스', 'Hatsuboshi Gakuen'],
  '花海咲季': ['하나미 사키', '하나미사키', 'Hanami Saki', '사키'],
  '月村手毬': ['츠키무라 테마리', '츠키무라테마리', 'Tsukimura Temari', '테마리'],
  '藤田ことね': ['후지타 코토네', '후지타코토네', 'Fujita Kotone', '코토네'],
  '有村麻央': ['아리무라 마오', 'Arimura Mao', '마오'],
  '葛城リーリヤ': ['카츠라기 리리야', 'Katsuragi Lilja', '리리야'],
  '倉本千奈': ['쿠라모토 치나', 'Kuramoto China', '치나'],
  '紫雲清夏': ['시운 스미카', 'Shiun Sumika', '스미카'],
  '篠澤広': ['시노사와 히로', 'Shinosawa Hiro', '히로'],
  '姫崎莉波': ['히메사키 리나미', 'Himesaki Rinami', '리나미'],
  '花海佑芽': ['하나미 우메', 'Hanami Ume', '우메'],
  '秦谷美鈴': ['하타야 미스즈', 'Hataya Misuzu', '미스즈'],
  '十王星南': ['쥬오 세나', '주오 세나', 'Juo Sena', '세나'],
  'TrySail': ['트라이세일', 'trysail'],
  'スフィア': ['스피어', 'sphere'],
  'ClariS': ['클라리스', 'claris'],
  'fripSide': ['프립사이드', 'fripside'],
  'angela': ['안젤라', 'angela'],
  'Poppin\'Party': ['포핀파티', '팝핀파티', 'poppin party', 'poppinparty'],
  'Roselia': ['로젤리아', 'roselia'],
  'RAISE A SUILEN': ['레이즈 어 수이렌', '라스', 'raise a suilen'],
  'Afterglow': ['애프터글로우', 'afterglow'],
  'Pastel*Palettes': ['파스텔 팔레트', '파스파레', 'pastel palettes'],
  'ハロー、ハッピーワールド！': ['헬로 해피 월드', '헬로해피', 'hello happy world'],
  'Morfonica': ['모르포니카', '몰포니카', 'morfonica'],
  'MyGO!!!!!': ['마이고', 'mygo', 'mygo!!!!!'],
  'Ave Mujica': ['아베 무지카', 'ave mujica'],
  'μ\'s': ['뮤즈', 'muse'],
  'Aqours': ['아쿠아', 'aqours'],
  '虹ヶ咲学園スクールアイドル同好会': ['니지가사키', '니지동', 'Nijigasaki'],
  'Liella!': ['리에라', 'liella'],
  '蓮ノ空女学院スクールアイドルクラブ': ['하스노소라', 'Hasunosora'],
  '放課後ティータイム': ['방과후 티타임', '방과후티타임', 'Houkago Tea Time', 'HTT'],
  'ALI PROJECT': ['알리 프로젝트', 'ali project'],
  'GRANRODEO': ['그란로데오', 'granrodeo'],
  'FLOW': ['플로우', 'flow'],
  'JAM Project': ['잼 프로젝트', 'jam project'],
  'T.M.Revolution': ['티엠레볼루션', 'tmrevolution', 't.m.revolution'],
  'Kalafina': ['카라피나', '칼라피나', 'kalafina'],
  'May\'n': ['메인', 'mayn'],
  '中島愛': ['나카지마 메구미', '나카지마메구미', 'Megumi Nakajima', '메구미'],
  'ワンダーランズ×ショウタイム': ['원더랜즈 쇼타임', '원더쇼', 'Wonderlands x Showtime'],
  '25時、ナイトコードで。': ['25시 나이트코드에서', '25시, 나이트코드에서.', '니고', 'Nightcord at 25:00'],
  'Leo/need': ['레오니드', '레오니', 'leo/need', 'leoneed'],
  'MORE MORE JUMP!': ['모어 모어 점프', '모모점', 'more more jump'],
  'Vivid BAD SQUAD': ['비비드 배드 스쿼드', '비배스', 'vivid bad squad'],

  // --- Vocaloid Producers, Utaite & VTubers ---
  '初音ミク': ['하츠네 미쿠', '하쓰네 미쿠', '하츠네미쿠', 'Hatsune Miku', '미쿠', 'miku'],
  '鏡音リン': ['카가미네 린', '가미네 린', '카가미네린', 'Kagamine Rin', '린', 'rin'],
  '鏡音レン': ['카가미네 렌', '카가미네렌', 'Kagamine Len', '렌', 'len'],
  '巡音ルカ': ['메구리네 루카', '메구리네루카', 'Megurine Luka', '루카', 'luka'],
  'MEIKO': ['메이코', 'meiko'],
  'KAITO': ['카이토', 'kaito'],
  'GUMI': ['구미', 'gumi'],
  'IA': ['이아', 'ia'],
  'flower': ['플라워', 'v flower'],
  '重音テト': ['카사네 테토', '가사네 테토', '카사네테토', 'Kasane Teto', '테토', 'teto'],
  'DECO*27': ['데코니나', '데코27', '데코', 'deco27', 'deco*27'],
  'wowaka': ['와와카', '오와카', 'wowaka'],
  'ハチ': ['하치', 'Hachi', 'hachi'],
  'Neru': ['네루', 'neru'],
  'kemu': ['케무', 'kemu'],
  'ピノキオピー': ['피노키오피', '피노키오P', 'PinocchioP', 'pinocchiop'],
  'PinocchioP': ['피노키오피', '피노키오P', 'ピノキオピー', 'pinocchiop'],
  'かいりきベア': ['카이리키 베어', '카이리키베어', 'Kairiki Bear', 'kairiki bear'],
  'Kairiki Bear': ['카이리키 베어', '카이리키베어', 'かいりきベア', 'kairiki bear'],
  'Kanaria': ['카나리아', 'kanaria'],
  'Chinozo': ['치노조', 'chinozo'],
  'syudou': ['슈도', '슈도우', 'syudou'],
  'じん': ['진', '자연의 적P', '자연의적P', 'Jin'],
  'Mitchie M': ['밋치 엠', '미치 엠', 'mitchie m'],
  '黒うさP': ['흑토끼P', '쿠로우사P', 'KurousaP', 'kurousap'],
  'みきとP': ['미키토P', '미키토피', 'MikitoP', 'mikitop'],
  'Giga': ['기가', '기가P', 'giga'],
  'Reol': ['레오루', '레올', 'れをる', 'reol'],
  'れをる': ['레오루', '레올', 'Reol', 'reol'],
  'MARETU': ['마레투', 'maretu'],
  '神崎イオリ': ['칸자키 이오리', '칸자키이오리', 'Kanzaki Iori', '이오리', 'iori'],
  'カンザキイオリ': ['칸자키 이오리', '칸자키이오리', 'Kanzaki Iori', '이오리', 'iori'],
  'すりぃ': ['스리', '스리이', 'Three', 'Surii', 'surii'],
  'ツミキ': ['츠미키', '쓰미키', 'Tsumiki', 'tsumiki'],
  '煮ル果実': ['니루 카지츠', '니루카지츠', '닐프루츠', 'NILFRUITS'],
  'てにをは': ['테니오하', '테니워하', 'Teniwoha', 'teniwoha'],
  'バルーン': ['벌룬', '바룬', 'Balloon', 'balloon'],
  '須田景凪': ['스다 케이나', '스다케이나', 'Keina Suda', '케이나'],
  'まふまふ': ['마후마후', 'Mafumafu', 'mafumafu'],
  'そらる': ['소라루', 'Soraru', 'soraru'],
  'After the Rain': ['애프터 더 레인', 'after the rain'],
  '天月-あまつき-': ['아마츠키', '아마쓰키', 'Amatsuki', 'amatsuki'],
  '天月': ['아마츠키', '아마쓰키', 'Amatsuki', 'amatsuki'],
  '96猫': ['쿠로네코', '96네코', '96neko'],
  'めいちゃん': ['메이짱', '메이찬', 'Meychan', 'meychan'],
  'すとぷり': ['스토푸리', '스트로베리 프린스', 'Strawberry Prince', 'sutopuri'],
  'いれいす': ['이레이스', 'Irregular Dice', 'ireisu'],
  '浦島坂田船': ['우라시마사카타센', 'Urashimasakatasen'],
  '星街すいせい': ['호시마치 스이세이', '호시마치스이세이', 'Hoshimachi Suisei', 'Suisei Hoshimachi', '스이세이', 'suisei'],
  '宝鐘マリン': ['호쇼 마린', '호우쇼 마린', '호쇼마린', 'Houshou Marine', 'Marine Houshou', '마린', 'marine'],
  '湊あくあ': ['미나토 아쿠아', '미나토아쿠아', 'Minato Aqua', 'Aqua Minato', '아쿠아', 'aqua'],
  '森カリオペ': ['모리 칼리오페', '모리칼리오페', 'Mori Calliope', 'Calliope Mori', '칼리오페', 'calliope'],
  '猫又おかゆ': ['네코마타 오카유', '네코마타오카유', 'Nekomata Okayu', '오카유', 'okayu'],
  '戌神ころね': ['이누가미 코로네', '이누가미코로네', 'Inugami Korone', '코로네', 'korone'],
  '白上フブキ': ['시라카미 후부키', '시라카미후부키', 'Shirakami Fubuki', '후부키', 'fubuki'],
  '兎田ぺこら': ['우사다 페코라', '우사다페코라', 'Usada Pekora', '페코라', 'pekora'],
  'さくらみこ': ['사쿠라 미코', '사쿠라미코', 'Sakura Miko', '미코', 'miko'],
  '角巻わため': ['츠노마키 와타메', '쓰노마키 와타메', '츠노마키와타메', 'Tsunomaki Watame', '와타메', 'watame'],
  '常闇トワ': ['토코야미 토와', '도코야미 토와', '토코야미토와', 'Tokoyami Towa', '토와', 'towa'],
  '天音かなた': ['아마네 카나타', '아마네 가나타', '아마네카나타', 'Amane Kanata', '카나타', 'kanata'],
  '百鬼あやめ': ['나키리 아야메', '나키리아야메', 'Nakiri Ayame', '아야메', 'ayame'],
  '大空スバル': ['오오조라 스바루', '오조라 스바루', '오오조라스바루', 'Oozora Subaru', '스바루', 'subaru'],
  '大神ミオ': ['오오카미 미오', '오카미 미오', '오오카미미오', 'Ookami Mio', '미오'],
  '潤羽るしあ': ['우루하 루시아', '우루하루시아', 'Uruha Rushia', '루시아'],
  '不知火フレア': ['시라누이 후레아', '시라누이후레아', 'Shiranui Flare', '후레아'],
  '白銀ノエル': ['시로가네 노엘', '시로가네노엘', 'Shirogane Noel', '노엘'],
  '尾丸ポルカ': ['오마루 폴카', '오마루폴카', 'Omaru Polka', '폴카'],
  '雪花ラミィ': ['유키하나 라미', '유키하나라미', 'Yukihana Lamy', '라미'],
  '桃鈴ねね': ['모모스즈 네네', '모모스즈네네', 'Momosuzu Nene', '네네'],
  '獅白ぼたん': ['시시로 보탄', '시시로보탄', 'Shishiro Botan', '보탄'],
  'ラプラス・ダークネス': ['라플라스 다크니스', '라플라스', 'La+ Darknesss'],
  '鷹嶺ルイ': ['타카네 루이', '다카네 루이', '타카네루이', 'Takane Lui', '루이'],
  '博衣こより': ['하쿠이 코요리', '하쿠이코요리', 'Hakui Koyori', '코요리'],
  '沙花叉クロヱ': ['사카마타 클로에', '사카마타클로에', 'Sakamata Chloe', '클로에'],
  '風真いろは': ['카자마 이로하', '가자마 이로하', '카자마이로하', 'Kazama Iroha', '이로하'],
  '儒烏風亭らでん': ['주우후테이 라덴', '쥬우후테이 라덴', '주후테이 라덴', '주우후테이라덴', 'Juufuutei Raden', '라덴', 'raden'],
  '火威青': ['히오도시 아오', '히오도시아오', 'Hiodoshi Ao', '아오', 'ao'],
  '一条莉々華': ['이치죠 리리카', '이치조 리리카', '이치죠리리카', 'Ichijou Ririka', '리리카', 'ririka'],
  '轟はじめ': ['토도로키 하지메', '도도로키 하지메', '토도로키하지메', 'Todoroki Hajime', '하지메', 'hajime'],
  '紫咲シオン': ['무라사키 시온', '무라사키시온', 'Murasaki Shion', '시온', 'shion'],
  'しぐれうい': ['시구레 우이', '시구레우이', 'Shigure Ui', '우이', 'ui'],
  'がうる・ぐら': ['가우르 구라', '가우르구라', 'Gawr Gura', '구라', 'gura'],
  'Gawr Gura': ['가우르 구라', '가우르구라', 'Gawr Gura', '구라', 'gura'],
  '葛葉': ['쿠즈하', '구즈하', 'Kuzuha', 'kuzuha'],
  '叶': ['카나에', '가나에', 'Kanae', 'kanae'],
  'ChroNoiR': ['크로노와르', 'chronoir'],
  'ROF-MAO': ['로프마오', 'rof-mao', 'rofmao'],
  '月ノ美兎': ['츠키노 미토', '쓰키노 미토', 'Tsukino Mito', '미토'],
  '星川サラ': ['호시카와 사라', 'Hoshikawa Sara', '사라'],
  '壱百満天原サロメ': ['햐쿠만텐바라 살로메', '살로메', 'Hyakumantenbara Salome', 'Salome'],
  '花譜': ['카후', '카프', 'KAF', 'Kaf', 'kaf'],
  'KAF': ['카후', '카프', '花譜', 'kaf'],
  '理芽': ['리메', 'RIM', 'rim'],
  '春猿火': ['하루사루히', 'Harusaruhi'],
  'ヰ世界情緒': ['이세카이죠쵸', '이세계정서', 'Isekaijoucho'],
  '幸祜': ['코코', 'KOKO'],
  'V.W.P': ['브이더블유피', 'vwp', 'v.w.p'],
  'DUSTCELL': ['더스트셀', 'dustcell'],
  'HIMEHINA': ['히메히나', 'himehina'],
  'ReGLOSS': ['리그로스', 'regloss'],

  // --- Song Titles: YOASOBI ---
  '夜に駆ける': ['요루니 카케루', '요루니카케루', '밤을 달리다', '밤을달리다', 'Yoru ni Kakeru', 'yoru ni kakeru', 'Racing into the Night', 'Into The Night'],
  'あの夢をなぞって': ['그 꿈을 덧그리며', '그꿈을덧그리며', '아노 유메오 나좃테', '아노유메오나좃테', 'Tracing A Dream', 'Ano Yume wo Nazotte'],
  'ハルジオン': ['봄망초', '하루지온', 'Halzion', 'Harujion'],
  'たぶん': ['아마도', '타분', 'Probably', 'Tabun'],
  '群青': ['군청', '군조', '군죠', 'Gunjou', 'Gunjo', 'gunjo', 'Blue'],
  'ハルカ': ['하루카', 'Haruka'],
  '怪物': ['괴물', 'Monster', 'Kaibutsu', '카이부츠', 'kaibutsu'],
  '優しい彗星': ['다정한 혜성', '상냥한 혜성', '야사시이 스이세이', 'Comet', 'Yasashii Suisei'],
  'もう少しだけ': ['조금만 더', '조금만더', '모우스코시다케', 'Just a Little Step', 'Mou Sukoshi Dake'],
  '三原色': ['삼원색', '산겐쇼쿠', 'RGB', 'Sangenshoku'],
  'アンコール': ['앙코르', '앵콜', 'Encore'],
  'ラブレター': ['러브레터', '러브 레터', 'Love Letter'],
  '大正浪漫': ['다이쇼 로망', '다이쇼로망', '타이쇼 로망', 'Romance', 'Taisho Roman'],
  'ツバメ': ['제비', '츠바메', 'The Swallow', 'Tsubame'],
  'ミスター': ['미스터', 'Mr.', 'Mister'],
  '好きだ': ['좋아해', '스키다', 'Sukida'],
  '祝福': ['축복', '슈쿠후쿠', 'The Blessing', 'Shukufuku'],
  '海のまにまに': ['바다의 뜻대로', '우미노 마니마니', 'Umi no Manimani'],
  'アドベンチャー': ['어드벤처', 'Adventure'],
  'セブンティーン': ['세븐틴', 'Seventeen'],
  'アイドル': ['아이돌', '아이도루', 'Idol', 'Aidoru', 'aidoru'],
  '勇者': ['용사', '유우샤', '유샤', 'The Brave', 'Yuusha', 'Yusha', 'yusha'],
  'Biri-Biri': ['비리비리', '찌릿찌릿', 'Biri Biri', 'biribiri'],
  'HEART BEAT': ['하트 비트', '하트비트', 'heart beat'],
  '舞台に立って': ['무대에 서서', '부타이니 탓테', 'On the Stage', 'Butai ni Tatte'],
  'モノトーン': ['모노톤', 'Monotone'],
  'New me': ['뉴 미', '뉴미', 'new me'],

  // --- Song Titles: Kenshi Yonezu / Hachi ---
  'Lemon': ['레몬', 'lemon'],
  'アイネクライネ': ['아이네 클라이네', '아이네클라이네', 'Eine Kleine'],
  'LOSER': ['루저', 'loser'],
  'ピースサイン': ['피스 사인', '피스사인', 'Peace Sign'],
  '打上花火': ['쏘아올린 불꽃', '우치아게 하나비', '우치아게하나비', 'Uchiage Hanabi', '불꽃놀이', 'Fireworks'],
  '灰色と青': ['잿빛과 푸름', '잿빛과푸름', '회색과 파랑', '하이이로토 아오', '하이이로토아오', 'Haiiro to Ao'],
  'Flamingo': ['플라밍고', 'flamingo'],
  'TEENAGE RIOT': ['틴에이지 라이엇', 'teenage riot'],
  '海の幽霊': ['바다의 유령', '우미노 유우레이', '우미노 유레이', 'Spirits of the Sea', 'Umi no Yuurei'],
  '馬と鹿': ['말과 사슴', '말과사슴', '우마토 시카', '우마토시카', 'Uma to Shika'],
  'パプリカ': ['파프리카', 'Paprika'],
  '感電': ['감전', '칸덴', 'Kanden', 'kanden'],
  'カムパネルラ': ['캄파넬라', 'Campanella'],
  'Pale Blue': ['페일 블루', '페일블루', 'pale blue'],
  '死神': ['사신', '시니가미', 'Shinigami'],
  'M八七': ['M87', '엠팔칠', '엠하치나나', 'M Hachijunana'],
  'KICK BACK': ['킥백', '킥 백', 'kick back'],
  'LADY': ['레이디', 'lady'],
  '月を見ていた': ['달을 보고 있었어', '달을 보고 있었다', '츠키오 미테이타', 'Moongazing', 'Tsuki wo Miteita'],
  '地球儀': ['지구본', '치큐우기', '치큐기', 'Spinning Globe', 'Chikyugi', 'Chikyuugi'],
  'さよーならまたいつか!': ['안녕 또 언젠가', '안녕 다시 언젠가', '사요나라 마타 이츠카', 'Sayonara, Mata Itsuka!', 'Sayonara Mata Itsuka'],
  '毎日': ['매일', '마이니치', 'Mainichi', 'Every Day'],
  'がらくた': ['잡동사니', '가라쿠타', 'JUNK', 'Garakuta'],
  'Azalea': ['아잘레아', '진달래', 'azalea'],
  'Plazma': ['플라즈마', 'plazma'],
  'BOW AND ARROW': ['보우 앤 애로우', 'bow and arrow'],
  'メトロノーム': ['메트로놈', 'Metronome'],
  '春雷': ['춘뢰', '슌라이', 'Shunrai'],
  'orion': ['오리온', 'Orion'],
  'vivi': ['비비', 'vivi'],
  'ゴーゴー幽霊船': ['고고 유령선', 'Go Go Ghost Ship'],

  // --- Song Titles: Ado ---
  'うっせぇわ': ['웃세와', '우세와', '우스에와', '시끄러워', 'Usseewa', 'usseewa'],
  'レディメイド': ['레디메이드', 'Readymade'],
  'ギラギラ': ['기라기라', '반짝반짝', '번쩍번쩍', 'Gira Gira'],
  '踊': ['오도', '춤', 'Odo', 'odo'],
  '夜のピエロ': ['밤의 피에로', '요루노 피에로', 'Yoru no Pierrot'],
  '会いたくて': ['보고 싶어서', '아이타쿠테', 'Aitakute'],
  '阿修羅ちゃん': ['아수라짱', '아슈라짱', 'Ashura-chan', 'Ashura chan'],
  '心という名の不可解': ['마음이라는 이름의 불가해', '코코로토 이우 나노 후카카이', 'Kokoro to Iu Na no Fukakai'],
  '新時代': ['신시대', '신지다이', 'Shinjidai', 'shinjidai', 'New Genesis'],
  '私は最強': ['나는 최강', '나는최강', '와타시와 사이쿄', '와타시와사이쿄', 'I\'m Invincible', 'Watashi wa Saikyou'],
  '逆光': ['역광', '갸쿠코', '갸쿠코우', 'Backlight', 'Gyakkou'],
  'ウタカタララバイ': ['물거품 자장가', '물거품자장가', '우타카타 라라바이', '우타카타라라바이', 'Fleeting Lullaby', 'Utakata Lullaby'],
  'Tot Musica': ['토트 무지카', 'tot musica'],
  '世界のつづき': ['세계의 다음', '세카이노 츠즈키', 'The World\'s Continuation', 'Sekai no Tsuzuki'],
  '風のゆくえ': ['바람의 행방', '카제노 유쿠에', 'Where the Wind Blows', 'Kaze no Yukue'],
  'リベリオン': ['리벨리온', 'Rebellion'],
  '行方知れず': ['행방불명', '유쿠에시레즈', 'Missing', 'Yukueshirezu'],
  'アタシは問題作': ['나는 문제작', '아타시와 몬다이사쿠', 'I\'m a Controversy', 'Atashi wa Mondaisaku'],
  'いばら': ['가시', '이바라', 'Ibara'],
  '向日葵': ['해바라기', '히마와리', 'Himawari'],
  '唱': ['창', '쇼', 'Show', 'show', 'Shou'],
  'DIGNITY': ['디그니티', 'dignity'],
  'クラクラ': ['어질어질', '쿠라쿠라', 'Kura Kura'],
  'オールナイトレディオ': ['올나이트 라디오', 'All Night Radio'],
  'ショコラカタブラ': ['쇼콜라 카타브라', 'Chocolat Cadabra'],
  'Value': ['밸류', 'value'],
  'MIRROR': ['미러', 'mirror'],
  'ルル': ['룰', '루루', 'RuLe', 'Rule', 'rulu'],
  '初夏': ['초하', '쇼카', 'Shoka'],

  // --- Song Titles: Official Hige Dandism ---
  'ノーダウト': ['노 다우트', '노다우트', 'No Doubt'],
  'Stand By You': ['스탠드 바이 유', '스탠바이유', 'stand by you'],
  'Pretender': ['프리텐더', 'pretender'],
  '宿命': ['숙명', '슈쿠메이', 'Shukumei'],
  'イエスタデイ': ['예스터데이', 'Yesterday'],
  '115万キロのフィルム': ['115만 킬로의 필름', '115만킬로의필름', '115만km의 필름', '115-man Kilo no Film'],
  'I LOVE...': ['아이 러브', '아이러브', 'i love'],
  'パラボラ': ['파라볼라', 'Parabola'],
  'Laughter': ['래프터', '라프터', 'laughter'],
  'Universe': ['유니버스', 'universe'],
  'Cry Baby': ['크라이 베이비', '크라이베이비', 'cry baby'],
  'アポトーシス': ['아포토시스', 'Apoptosis'],
  'Anarchy': ['아나키', 'anarchy'],
  'ミックスナッツ': ['믹스드 너츠', '믹스드너츠', '믹스 너츠', '믹스너츠', 'Mixed Nuts'],
  'Subtitle': ['서브타이틀', 'subtitle'],
  'ホワイトノイズ': ['화이트 노이즈', '화이트노이즈', 'White Noise'],
  'TATTOO': ['타투', 'tattoo'],
  'Chessboard': ['체스보드', 'chessboard'],
  '日常': ['일상', '니치죠', 'Nichijou'],
  'SOULSOUP': ['소울수프', '소울 수프', 'soulsoup'],
  'Sharon': ['샤론', 'sharon'],
  'Same Blue': ['세임 블루', '세임블루', 'same blue'],

  // --- Song Titles: Mrs. GREEN APPLE ---
  'StaRt': ['스타트', 'start'],
  'Speaking': ['스피킹', 'speaking'],
  '青と夏': ['푸름과 여름', '청과 여름', '아오토 나츠', '아오토나츠', 'Ao to Natsu'],
  '僕のこと': ['나에 대한 것', '보쿠노 코토', '보쿠노코토', 'Boku no Koto'],
  'ロマンチシズム': ['로맨티시즘', 'Romanticism'],
  'インフェルノ': ['인페르노', 'Inferno'],
  'CHEERS': ['치어스', 'cheers'],
  '点描の唄': ['점묘의 노래', '점묘의노래', '텐뵤노 우타', '텐뵤우노 우타', 'Tenbyou no Uta'],
  '春愁': ['춘수', '슌슈', 'Shunshuu'],
  'WanteD! WanteD!': ['원티드 원티드', 'wanted wanted'],
  'ニュー・マイ・ノーマル': ['뉴 마이 노멀', 'New My Normal'],
  'ダンスホール': ['댄스홀', '댄스 홀', 'Dance Hall', 'dance hall'],
  'ブルーアンビエンス': ['블루 앰비언스', 'Blue Ambience'],
  'Soranji': ['소란지', 'soranji'],
  'ケセラセラ': ['케세라세라', 'Que Sera Sera', 'que sera sera'],
  'Magic': ['매직', 'magic'],
  'ANTENNA': ['안테나', 'antenna'],
  'ナハトムジーク': ['나흐트무지크', 'Nachtmusik'],
  'ライラック': ['라일락', 'Lilac', 'lilac'],
  'Dear': ['디어', 'dear'],
  'コロンブス': ['콜럼버스', 'Columbus'],
  'アポロドロス': ['아폴로도로스', 'Apollodorus'],
  'familie': ['파밀리에', 'familie'],
  'ビターバカンス': ['비터 바캉스', 'Bitter Vacances'],

  // --- Song Titles: Vaundy ---
  '東京フラッシュ': ['도쿄 플래시', '도쿄플래시', 'Tokyo Flash'],
  '不可幸力': ['불가행력', '후카코우료쿠', '후카코료쿠', 'Fukakouryoku'],
  '怪獣の花唄': ['괴수의 꽃노래', '괴수의꽃노래', '카이쥬노 하나우타', '카이주노 하나우타', '카이쥬노하나우타', 'Kaiju no Hanauta'],
  'life hack': ['라이프 핵', '라이프핵', 'life hack'],
  'napori': ['나폴리', 'napori'],
  '世界の秘密': ['세계의 비밀', '세카이노 히미츠', 'Sekai no Himitsu'],
  '融解sink': ['융해 싱크', '융해 sink', '유우카이 싱크', 'Yuukai Sink'],
  'しわあわせ': ['주름맞추기', '시와아와세', 'Shiwaawase'],
  '花占い': ['꽃점', '하나우라나이', 'Hanauranai'],
  '踊り子': ['무희', '오도리코', 'Odoriko'],
  '泣き地蔵': ['우는 지장보살', '나키지조', 'Nakijizou'],
  '裸の勇者': ['발가벗은 용사', '하다카노 유우샤', 'Hadaka no Yuusha', 'Naked Hero'],
  '恋風邪にのせて': ['사랑 감기에 실려', '코이카제니 노세테', 'Koikaze ni Nosete'],
  'CHAINSAW BLOOD': ['체인소 블러드', 'chainsaw blood'],
  '瞳惚れ': ['눈에 반하다', '히토미보레', 'Hitomibore'],
  '忘れ物': ['분실물', '와스레모노', 'Wasuremono'],
  'まぶた': ['눈꺼풀', '마부타', 'Mabuta'],
  'そんなbitterな話': ['그런 비터한 이야기', '그런 씁쓸한 이야기', '손나 비타나 하나시', 'Sonna Bitter na Hanashi'],
  'トドメの一撃': ['최후의 일격', '토도메노 이치게키', 'Todome no Ichigeki'],
  'タイムパラドックス': ['타임 패러독스', '타임패러독스', 'Time Paradox'],
  'ホムンクルス': ['호문쿨루스', 'Homunculus'],
  '風神': ['풍신', '후우진', 'Fuujin'],

  // --- Song Titles: King Gnu ---
  'Vinyl': ['바이닐', '비닐', 'vinyl'],
  'Prayer X': ['프레이어 엑스', 'prayer x'],
  '白日': ['백일', '하쿠지츠', 'Hakujitsu'],
  '飛行艇': ['비행정', '히코우테이', '히코테이', 'Hikoutei'],
  '傘': ['우산', '카사', 'Kasa'],
  'Teenager Forever': ['틴에이저 포에버', 'teenager forever'],
  'どろん': ['도론', 'Doron'],
  '三文小説': ['삼문소설', '산몬쇼세츠', 'Sanmon Shousetsu'],
  '千両役者': ['천량역자', '센료야쿠샤', 'Senryou Yakusha'],
  '泡': ['거품', '아부쿠', 'Abuku'],
  'BOY': ['보이', 'boy'],
  '一途': ['일도', '일편단심', '이치즈', 'Ichizu', 'ichizu'],
  '逆夢': ['역몽', '사카유메', 'Sakayume', 'sakayume'],
  'カメレオン': ['카멜레온', 'Chameleon'],
  '雨燦々': ['우찬찬', '아메산산', 'Ame Sansan'],
  'Stardom': ['스타덤', 'stardom'],
  'SPECIALZ': ['스페셜즈', '스페셜', 'Specialz'],
  '硝子窓': ['유리창', '가라스마도', 'Garasumado'],
  'ねっこ': ['뿌리', '넷코', 'Nekko'],

  // --- Song Titles: Yuuri / Aimyon / back number ---
  'ドライフラワー': ['드라이 플라워', '드라이플라워', 'Dry Flower', 'dry flower'],
  'ベテルギウス': ['베텔기우스', 'Betelgeuse', 'betelgeuse'],
  'かくれんぼ': ['숨바꼭질', '카쿠렌보', 'Kakurenbo'],
  'ピーターパン': ['피터팬', 'Peter Pan'],
  'インフィニティ': ['인피니티', 'Infinity'],
  'シャッター': ['셔터', 'Shutter'],
  'ミズキリ': ['물수제비', '미즈키리', 'Mizukiri'],
  'レオ': ['레오', 'Leo'],
  'おにごっこ': ['술래잡기', '오니곳코', 'Onigokko'],
  'クリスマスイブ': ['크리스마스 이브', 'Christmas Eve'],
  'メリーゴーランド': ['메리 고 라운드', '회전목마', 'Merry-Go-Round'],
  'ビリミリオン': ['빌리밀리언', 'Billimillion'],
  '恋人じゃなくなった日': ['연인이 아니게 된 날', '코이비토자 나쿠낫타 히'],
  'アストロノーツ': ['아스트로노츠', 'Astronauts'],
  'カーテンコール': ['커튼콜', 'Curtain Call'],
  '生きていたんだよな': ['살아있었던 거야', '이키테 이탄다요나', 'Ikiteitandayona'],
  '愛を伝えたいだとか': ['사랑을 전하고 싶다던가', '사랑을 전하고 싶다거나', '아이오 츠타에타이다토카', 'Ai wo Tsutaetaidatoka'],
  '君はロックを聴かない': ['너는 록을 듣지 않아', '키미와 록쿠오 키카나이', 'Kimi wa Rock wo Kikanai'],
  '満月の夜なら': ['보름달 밤이라면', '만게츠노 요루나라', 'Mangetsu no Yoru Nara'],
  'マリーゴールド': ['마리골드', '마리고루도', 'Marigold', 'marigold'],
  '今夜このまま': ['오늘 밤 이대로', '콘야 코노마마', 'Konya Konomama'],
  'ハルノヒ': ['하루노히', '봄날', 'Harunohi', 'harunohi'],
  '真夏の夜の匂いがする': ['한여름 밤의 냄새가 나', '마나츠노 요루노 니오이가 스루'],
  '空の青さを知る人よ': ['하늘의 푸르름을 아는 사람이여', '소라노 아오사오 시루 히토요'],
  'さよならの今日に': ['안녕의 오늘에', '사요나라노 쿄우니'],
  '裸の心': ['발가벗은 마음', '하다카노 코코로', 'Hadaka no Kokoro', 'Naked Heart'],
  '桜が降る夜は': ['벚꽃이 내리는 밤에는', '사쿠라가 후루 요루와'],
  '愛を知るまでは': ['사랑을 알기까지는', '아이오 시루 마데와'],
  'ハート': ['하트', 'Heart'],
  '初恋が泣いている': ['첫사랑이 울고 있어', '하츠코이가 나이테 이루'],
  '愛の花': ['사랑의 꽃', '아이노 하나', 'Ai no Hana'],
  'あのね': ['있잖아', '아노네', 'Anone'],
  '会いに行くのに': ['만나러 가는데', '아이니 이쿠노니'],
  'ざらめ': ['자라메', '굵은 설탕', 'Zarame'],
  '花束': ['꽃다발', '하나타바', 'Hanataba'],
  '高嶺の花子さん': ['절벽 위의 하나코 씨', '타카네노 하나코상', '타카네노 하나코산', 'Takane no Hanako-san'],
  'ヒロイン': ['히로인', 'Heroine'],
  'クリスマスソング': ['크리스마스 송', 'Christmas Song'],
  '僕の名前を': ['내 이름을', '보쿠노 나마에오', 'Boku no Namae wo'],
  '黒い猫の歌': ['검은 고양이의 노래', '쿠로이 네코노 우타'],
  'ハッピーエンド': ['해피 엔드', '해피엔드', 'Happy End'],
  '瞬き': ['깜빡임', '마바타키', 'Mabataki'],
  '大不正解': ['대오답', '다이후세이카이', 'Daifuseikai'],
  'オールドファッション': ['올드 패션', 'Old Fashion'],
  'HAPPY BIRTHDAY': ['해피 버스데이', 'happy birthday'],
  'エメラルド': ['에메랄드', 'Emerald'],
  '水平線': ['수평선', '스이헤이센', 'Suiheisen'],
  '怪盗': ['괴도', '카이토', 'Kaitou'],
  '黄色': ['노란색', '키이로', 'Kiiro'],
  'ベルベットの詩': ['벨벳의 시', 'Velvet no Uta'],
  'アイラブユー': ['아이 러브 유', '아이러브유', 'I Love You'],
  '冬と春': ['겨울과 봄', '후유토 하루', 'Fuyu to Haru'],
  '新しい恋人達に': ['새로운 연인들에게', '아타라시이 코이비토타치니'],

  // --- Song Titles: Yorushika / ZUTOMAYO / Eve ---
  '言って。': ['말해줘', '잇테', 'Say It', 'Itte'],
  'ただ君に晴れ': ['그저 네게 맑아라', '그저네게맑아라', '타다 키미니 하레', '타다키미니하레', 'Just a Sunny Day for You', 'Tada Kimi ni Hare'],
  'ヒッチコック': ['히치콕', 'Hitchcock'],
  '藍二乗': ['쪽빛 제곱', '아이니죠', 'Ai Nijou', 'Deep Indigo'],
  'だから僕は音楽を辞めた': ['그래서 나는 음악을 그만두었다', '다카라 보쿠와 온가쿠오 야메타', 'That\'s Why I Gave Up on Music'],
  '心に穴が空いた': ['마음에 구멍이 뚫렸다', '코코로니 아나가 아이타'],
  '雨とカプチーノ': ['비와 카푸치노', '아메토 카푸치노', 'Rain with Cappuccino', 'Ame to Cappuccino'],
  '夜行': ['야행', '야코우', 'Yakou', 'Night Journey'],
  '花に亡霊': ['꽃에 망령', '꽃에망령', '하나니 보우레이', '하나니 보레이', 'Ghost in a Flower', 'Hana ni Bourei'],
  '思想犯': ['사상범', '시소우한', 'Shisouhan', 'Thoughtcrime'],
  '盗作': ['도작', '토우사쿠', 'Plagiarism', 'Tousaku'],
  '春ひさぎ': ['매춘', '하루히사기', 'Prostitution', 'Haru Hisagi'],
  '風を食む': ['바람을 먹다', '카제오 하무', 'Eat the Wind', 'Kaze wo Hamu'],
  '春泥棒': ['봄도둑', '하루도로보', 'Spring Thief', 'Haru Dorobou'],
  '又三郎': ['마타사부로', 'Matasaburo'],
  '老人と海': ['노인과 바다', '로우진토 우미', 'The Old Man and the Sea'],
  '月に吠える': ['달에 짖다', '츠키니 호에루', 'Howl at the Moon'],
  'ブレーメン': ['브레멘', 'Bremen'],
  '左右盲': ['좌우맹', '사유우모우', 'Left-Right Confusion'],
  'チノカテ': ['치노카테', 'Chinokate', 'Fruits of the Earth'],
  'アルジャーノン': ['앨저넌', '알저넌', 'Algernon'],
  '斜陽': ['사양', '샤요우', '샤요', 'Setting Sun', 'Shayou'],
  '晴る': ['개다', '맑음', '하루', 'Haru', 'Sunny'],
  '忘却': ['망각', '보우캬쿠'],
  'アポリア': ['아포리아', 'Aporia'],
  '太陽': ['태양', '타이요', 'Taiyou', 'Sun'],
  '秒針を噛む': ['초침을 깨물다', '초침을깨물다', '뵤신오 카무', 'Byoushin wo Kamu', 'Bite the Second Hand'],
  '脳裏上のクラッカー': ['뇌리상의 크래커', '노우리우에노 크래커', 'Nouriueno Cracker'],
  'ヒューマノイド': ['휴머노이드', 'Humanoid'],
  '眩しいDNAだけ': ['눈부신 DNA만', '마부시이 DNA다케', 'Mabushii DNA Dake'],
  '正義': ['정의', '세이기', 'Seigi', 'Justice'],
  '勘ぐれい': ['감 그레이', '칸구레이'],
  'お勉強しといてよ': ['공부해 둬', '오벤쿄시토이테요', 'Study Me', 'Obenkyou Shitoiteyo'],
  'MILABO': ['미라보', 'milabo'],
  '低血ボルト': ['저혈 볼트', '테이케츠 볼트', 'Fastening'],
  '暗く黒く': ['어둡고 검게', '쿠라쿠 쿠로쿠', 'Darken', 'Kuraku Kuroku'],
  '勘冴えて悔しいわ': ['감이 좋아서 분해', '칸 사에테 쿠야시이와', 'Kan Saete Kuyashiiwa'],
  '正しくなれない': ['올바를 수 없어', '타다시쿠 나레나이', 'Can\'t Be Right', 'Tadashiku Narenai'],
  'あいつら全員同窓会': ['그 녀석들 전원 동창회', '아이츠라 젠인 도소카이', 'Inside Joke'],
  'ばかじゃないのに': ['바보가 아닌데', '바카자 나이노니', 'Stay Foolish'],
  '残機': ['잔기', '잔키', 'Zanki', 'Time Left'],
  '綺羅キラー': ['키라 킬러', '키라킬러', 'Kira Killer'],
  '花一匁': ['하나이치몬메', 'Hanaichi Monnme'],
  '嘘じゃない': ['거짓말이 아니야', '우소자 나이', 'Truth in Lies'],
  'ナンセンス文学': ['난센스 문학', 'Nonsense Bungaku', 'Literary Nonsense'],
  'あの娘シークレット': ['그 아이 시크릿', '아노코 시크릿', 'Anoko Secret'],
  'ドラマツルギー': ['드라마투르기', 'Dramaturgy'],
  'お気に召すまま': ['마음에 드시는 대로', '오키니 메스 마마', 'As You Like It', 'Oki ni Mesu Mama'],
  'アウトサイダー': ['아웃사이더', 'Outsider'],
  'トーキョーゲットー': ['도쿄 게토', 'Tokyo Ghetto'],
  'ラストダンス': ['라스트 댄스', 'Last Dance'],
  '僕らまだアンダーグラウンド': ['우린 아직 언더그라운드', '보쿠라 마다 언더그라운드', 'We\'re Still Underground'],
  '君に世界': ['너에게 세계', '키미니 세카이', 'This World to You'],
  '闇夜': ['암야', '야미요', 'Dark night', 'Yamiyo'],
  'レーゾンデートル': ['레종 데트르', '존재이유', 'Raison d\'etre'],
  '心予報': ['마음예보', '코코로 요호', 'Heart Forecast', 'Kokoro Yohou'],
  'いのちの食べ方': ['생명을 먹는 법', '이노치노 타베카타', 'How to Eat Life', 'Inochi no Tabekata'],
  '廻廻奇譚': ['회회기담', '카이카이 키탄', '카이카이키탄', 'Kaikai Kitan'],
  '心海': ['심해', '신카이', 'Shinkai'],
  '夜は仄か': ['밤은 아스라이', '요루와 호노카', 'Yoruwa Honoka'],
  'ファイトソング': ['파이트 송', 'Fight Song'],
  'ぼくらの': ['우리들의', '보쿠라노', 'Bokurano'],

  // --- Song Titles: Fujii Kaze / Gen Hoshino / Hikaru Utada / RADWIMPS ---
  '何なんw': ['뭐야', '난난', 'Nan-Nan', 'Nan Nan'],
  'もうええわ': ['이제 됐어', '모우 에에와', 'Mo-Eh-Wa'],
  '優しさ': ['상냥함', '다정함', '야사시사', 'Yasashisa'],
  'キリがないから': ['끝이 없으니까', '키리가 나이카라', 'Kiri Ga Naikara'],
  '罪の香り': ['죄의 향기', '츠미노 카오리', 'Tsumi no Kaori'],
  '死ぬのがいいわ': ['죽는 게 나아', '죽는게나아', '시누노가 이이와', '시누노가이이와', 'Shinunoga E-Wa'],
  '青春病': ['청춘병', '세이슌뵤', 'Seishun Sick'],
  '旅路': ['여로', '타비지', 'Tabiji'],
  'きらり': ['키라리', 'Kirari'],
  '燃えよ': ['타올라라', '모에요', 'Mo-Eh-Yo'],
  'まつり': ['마츠리', '축제', 'Matsuri'],
  'damn': ['댐', 'damn'],
  'grace': ['그레이스', 'grace'],
  'ガーデン': ['가든', 'Garden'],
  'Workin\' Hard': ['워킹 하드', 'workin hard'],
  '花': ['꽃', '하나', 'Hana', 'Flower'],
  '満ちてゆく': ['가득 차오르다', '미치테유쿠', 'Michiteyuku', 'Overflowing'],
  'Feelin\' Go(o)d': ['필링 굿', 'feelin good'],
  'くせのうた': ['버릇의 노래', '쿠세노 우타', 'Kuse no Uta'],
  'フィルム': ['필름', 'Film'],
  '知らない': ['몰라', '시라나이', 'Shiranai'],
  '地獄でなぜ悪い': ['지옥이 어때서', '지고쿠데 나제 와루이', 'Why Don\'t You Play in Hell?'],
  'Crazy Crazy': ['크레이지 크레이지', 'crazy crazy'],
  'SUN': ['선', 'sun'],
  '時よ': ['시간이여', '토키요', 'Tokiyo'],
  '恋': ['사랑', '코이', 'Koi', 'Love'],
  'Family Song': ['패밀리 송', 'family song'],
  'ドラえもん': ['도라에몽', 'Doraemon'],
  'アイデア': ['아이디어', 'Idea'],
  'Pop Virus': ['팝 바이러스', 'pop virus'],
  '不思議': ['불사의', '이상함', '후시기', 'Fushigi'],
  '喜劇': ['희극', '키게키', 'Comedy', 'Kigeki'],
  '異世界混合大舞踏会': ['이세계 혼합 대무도회', '이세카이 콘고 다이부토카이'],
  '光の跡': ['빛의 흔적', '히카리노 아토', 'Why'],
  'Automatic': ['오토매틱', 'automatic'],
  'First Love': ['퍼스트 러브', '퍼스트러브', '하츠코이', 'first love'],
  'Wait & See ~リスク~': ['웨이트 앤 시', 'wait and see'],
  'Can You Keep A Secret?': ['캔 유 킵 어 시크릿', 'can you keep a secret'],
  'FINAL DISTANCE': ['파이널 디스턴스', 'final distance'],
  'traveling': ['트래블링', 'traveling'],
  '光': ['빛', '히카리', 'Hikari'],
  'SAKURAドロップス': ['사쿠라 드롭스', 'Sakura Drops'],
  'COLORS': ['컬러즈', 'colors'],
  '誰かの願いが叶うころ': ['누군가의 소원이 이루어질 무렵', '다레카노 네가이가 카나우 코로'],
  'Flavor Of Life': ['플레이버 오브 라이프', 'flavor of life'],
  'Beautiful World': ['뷰티풀 월드', 'beautiful world'],
  'Prisoner Of Love': ['프리즈너 오브 러브', 'prisoner of love'],
  '花束を君に': ['꽃다발을 너에게', '하나타바오 키미니', 'Hanataba wo Kimi ni'],
  '真夏の通り雨': ['한여름의 소나기', '마나츠노 토오리아메'],
  '道': ['길', '미치', 'Michi'],
  'あなた': ['당신', '아나타', 'Anata'],
  '初恋': ['하츠코이', '첫사랑', 'Hatsukoi', 'hatsukoi'],
  'Time': ['타임', 'time'],
  'One Last Kiss': ['원 라스트 키스', '원라스트키스', 'one last kiss'],
  '君に夢中': ['너에게 열중', '키미니 무츄', 'Kimi ni Muchuu'],
  'BADモード': ['배드 모드', 'Bad Mode'],
  'Gold ~また逢う日まで~': ['골드 다시 만날 날까지', 'Gold'],
  '何色でもない花': ['어느 색도 아닌 꽃', '나니이로데모 나이 하나'],
  '前前前世': ['전전전세', '젠젠젠세', 'Zenzenzense', 'zenzenzense'],
  'スパークル': ['스파클', 'Sparkle', 'sparkle'],
  '夢灯籠': ['꿈의 등불', '유메토우로우', '유메토로', 'Dream lantern', 'Yumetourou'],
  'なんでもないや': ['아무것도 아니야', '난데모나이야', 'Nandemonaiya'],
  '愛にできることはまだあるかい': ['사랑이 할 수 있는 일이 아직 있을까', '사랑이할수있는일이아직있을까', '아이니 데키루 코토와 마다 아루카이', 'Is There Still Anything That Love Can Do'],
  'グランドエスケープ': ['그랜드 이스케이프', '그랜드이스케이프', 'Grand Escape'],
  '大丈夫': ['괜찮아', '다이죠부', 'We\'ll Be Alright', 'Daijoubu'],
  '祝祭': ['축제', '슈쿠사이', 'Celebration', 'Shukusai'],
  '風たちの声': ['바람들의 목소리', '카제타치노 코에', 'Voice of Wind'],
  'すずめ': ['스즈메', 'Suzume'],
  'カナタハルカ': ['카나타 하루카', '카나타하루카', '아득히 저편', 'Kanata Haruka'],
  '有心論': ['유심론', '유신론', 'Yuushinron'],
  'おしゃかしゃま': ['오샤카샤마', 'Oshakashama'],
  'いいんですか?': ['괜찮은가요', '이인데스카', 'Iindesuka'],
  'ふたりごと': ['두 사람 이야기', '후타리고토', 'Futarigoto'],
  '君と羊と青': ['너와 양과 파랑', '키미토 히츠지토 아오', 'Kimi to Hitsuji to Ao'],
  'DADA': ['다다', 'dada'],
  'そっけない': ['쌀쌀맞아', '솟케나이', 'Sokkenai'],
  'うるうびと': ['윤사람', '우루우비토', 'Uruubito'],

  // --- Song Titles: Bocchi the Rock! (Kessoku Band) ---
  '青春コンプレックス': ['청춘 콤플렉스', '청춘콤플렉스', '세이슌 콤플렉스', 'Seishun Complex'],
  'ひとりぼっち東京': ['외톨이 도쿄', '히토리봇치 도쿄', 'Hitoribocchi Tokyo'],
  'Distortion!!': ['디스토션', 'distortion'],
  'ひみつ基地': ['비밀기지', '히미츠키치', 'Secret Base', 'Himitsu Kichi'],
  'ギターと孤独と蒼い惑星': ['기타와 고독과 푸른 행성', '기타와고독과푸른행성', 'Guitar Loneliness and Blue Planet', 'Guitar, Loneliness and Blue Planet'],
  'ラブソングが歌えない': ['러브송을 부를 수 없어', '라브송가가 우타에나이', 'I Can\'t Sing a Love Song'],
  'あのバンド': ['아노 밴드', '아노밴드', '그 밴드', 'That Band', 'Ano Band'],
  'カラカラ': ['카라카라', '바싹바싹', 'Karakara'],
  '小さな海': ['작은 바다', '치이사나 우미', 'The Little Sea', 'Chiisana Umi'],
  'なにが悪い': ['나니가 와루이', '나니가와루이', '뭐가 나빠', 'What is wrong with', 'Nani ga Warui'],
  '忘れてやらない': ['와스레테 야라나이', '와스레테야라나이', '절대 잊지 않아', '잊어주지 않아', 'Never forget', 'Wasurete Yaranai'],
  '星座になれたら': ['별자리가 될 수 있다면', '별자리가될수있다면', '세이자니 나레타라', 'If I Could Be a Constellation', 'Seiza ni Naretara'],
  'フラッシュバッカー': ['플래시백커', 'Flashbacker'],
  '転がる岩、君に朝が降る': ['구르는 바위 너에게 아침이 내린다', '구르는바위너에게아침이내린다', '코로가루 이와 키미니 아사가 후루', 'Rockn Roll Morning Light Falls on You'],
  '光の中へ': ['빛 속으로', '빛속으로', '히카리노 나카에', 'Into the Light', 'Hikari no Naka e'],
  '青い春と西の空': ['푸른 봄과 서쪽 하늘', '아오이 하루토 니시노 소라', 'Blue Spring and Western Sky'],
  '月並みに輝け': ['평범하게 빛나라', '평범하게빛나라', '츠키나미니 카가야케', 'Shine as usual', 'Tsukinami ni Kagayake'],
  '今、僕、アンダーグラウンドから': ['지금 나 언더그라운드에서', '지금나언더그라운드에서', '이마 보쿠 언더그라운드카라'],
  'ドッペルゲンガー': ['도플갱어', 'Doppelganger'],
  '僕と三原色': ['나와 삼원색', '보쿠토 산겐쇼쿠'],
  '秒針少女': ['초침소녀', '뵤신쇼죠', 'Chronostasis'],
  'Re:Re:': ['리리', 're re'],

  // --- Song Titles: Anime Mega-Hits & Classics ---
  '炎': ['호무라', 'Homura', 'homura', '불꽃'],
  '紅蓮華': ['구렌게', 'Gurenge', 'gurenge', '홍련화'],
  '残響散歌': ['잔향산가', '잔쿄 산카', '잔쿄산카', 'Zankyou Sanka', 'zankyou sanka'],
  '朝が来る': ['아침이 온다', '아사가 쿠루', 'Asa ga Kuru'],
  '絆ノ奇跡': ['인연의 기적', '인연의기적', '키즈나노 키세키', '키즈나노키세키', 'Kizuna no Kiseki'],
  'コイコガレ': ['코이코가레', 'Koikogare'],
  '夢幻': ['몽환', '무겐', 'Mugen'],
  'カタオモイ': ['카타오모이', 'Kataomoi', 'kataomoi', '짝사랑'],
  'コイワズライ': ['코이와즈라이', 'Koiwazurai', '상사병'],
  '六等星の夜': ['육등성의 밤', '로쿠토세이노 요루', 'Rokutousei no Yoru'],
  'RE:I AM': ['리 아이 엠', 're i am'],
  'StarRingChild': ['스타링 차일드', 'starringchild'],
  'Brave Shine': ['브레이브 샤인', '브레이브샤인', 'brave shine'],
  'LAST STARDUST': ['라스트 스타더스트', 'last stardust'],
  'ninelie': ['나인라이', 'ninelie'],
  '蝶々結び': ['나비매듭', '초초무스비', 'Chouchou Musubi'],
  '花の唄': ['꽃의 노래', '하나노 우타', 'Hana no Uta'],
  'ONE': ['원', 'one'],
  'Ref:rain': ['리프레인', 'refrain'],
  'Black Bird': ['블랙 버드', '블랙버드', 'black bird'],
  'I beg you': ['아이 베그 유', 'i beg you'],
  'STAND-ALONE': ['스탠드 얼론', 'stand alone'],
  '春はゆく': ['봄은 간다', '봄은간다', '하루와 유쿠', 'Haru wa Yuku'],
  'SPARK-AGAIN': ['스파크 어게인', 'spark again'],
  'Deep down': ['딥 다운', 'deep down'],
  'Escalator': ['에스컬레이터', 'escalator'],
  'oath sign': ['오스 사인', '오스사인', 'oath sign'],
  'crossing field': ['크로싱 필드', '크로싱필드', 'crossing field'],
  'Rising Hope': ['라이징 호프', 'rising hope'],
  'シルシ': ['증표', '시루시', 'Shirushi'],
  'Rally Go Round': ['랠리 고 라운드', 'rally go round'],
  'Catch the Moment': ['캐치 더 모먼트', '캐치더모먼트', 'catch the moment'],
  'ASH': ['애쉬', 'ash'],
  'ADAMAS': ['아다마스', 'adamas'],
  'unlasting': ['언래스팅', 'unlasting'],
  'dawn': ['던', '새벽', 'dawn'],
  '往け': ['가라', '유케', 'Yuke'],
  '明け星': ['샛별', '아케보시', 'Akeboshi'],
  '白銀': ['백은', '시로가네', '하쿠긴', 'Shirogane', 'Hakugin'],
  'REALiZE': ['리얼라이즈', 'realize'],
  'IGNITE': ['이그나이트', 'ignite'],
  'ANIMA': ['아니마', 'anima'],
  'RESISTER': ['레지스터', 'resister'],
  '残酷な天使のテーゼ': ['잔혹한 천사의 테제', '잔혹한천사의테제', '잔코쿠나 텐시노 테제', '잔코쿠나텐시노테제', 'A Cruel Angel\'s Thesis', 'Zankoku na Tenshi no Teze'],
  '魂のルフラン': ['영혼의 루프란', '영혼의루프란', '타마시이노 루프란', 'Soul\'s Refrain', 'Tamashii no Refrain'],
  '翼をください': ['날개를 주세요', '츠바사오 쿠다사이', 'Tsubasa wo Kudasai'],
  'Komm, süsser Tod': ['오라 달콤한 죽음이여', '콤 쥐서 토트', 'komm susser tod'],
  'Tank!': ['탱크', 'tank'],
  'Butter-Fly': ['버터플라이', 'butter fly', 'butterfly'],
  'brave heart': ['브레이브 하트', '브레이브하트', 'brave heart'],
  'ウィーアー!': ['위 아!', '위 아', '위아', 'We Are!', 'We Are', 'we are'],
  'Believe': ['빌리브', 'believe'],
  'ココロのちず': ['마음의 지도', '코코로노 치즈', 'Kokoro no Chizu'],
  'Share The World': ['셰어 더 월드', 'share the world'],
  'One day': ['원 데이', 'one day'],
  'Fight Together': ['파이트 투게더', 'fight together'],
  'HOPE': ['호프', 'hope'],
  '最高到達点': ['최고도달점', '사이코 토타츠텐', 'Saikou Toutatsuten'],
  'ブルーバード': ['블루 버드', '블루버드', 'Blue Bird'],
  'シルエット': ['실루엣', 'Silhouette'],
  'GO!!!': ['고', 'go'],
  '遥か彼方': ['아득한 저편', '아득한저편', '하루카 카나타', 'Haruka Kanata'],
  '悲しみをやさしさに': ['슬픔을 상냥함으로', '카나시미오 야사시사니', 'Kanashimi wo Yasashisa ni'],
  'ホタルノヒカリ': ['반딧불이의 빛', '호타루노 히카리', 'Sha la la', 'Hotaru no Hikari'],
  'Sign': ['사인', 'sign'],
  'ラヴァーズ': ['러버즈', 'Lovers'],
  '月の大きさ': ['달의 크기', '츠키노 오오키사', 'Tsuki no Ookisa'],
  '紅蓮': ['홍련', '구렌', 'Guren'],
  'ブラッドサーキュレーター': ['블러드 서큘레이터', 'Blood Circulator'],
  'カラノココロ': ['텅 빈 마음', '카라노 코코로', 'Kara no Kokoro'],
  '＊〜アスタリスク〜': ['아스타리스크', 'Asterisk'],
  'D-tecnoLife': ['디 테크노라이프', 'd tecnolife'],
  '一輪の花': ['한 송이의 꽃', '이치린노 하나', 'Ichirin no Hana'],
  'Rolling star': ['롤링 스타', '롤링스타', 'rolling star'],
  'ALONES': ['얼론즈', 'alones'],
  'アフターダーク': ['애프터 다크', 'After Dark'],
  'CHAngE': ['체인지', 'change'],
  '乱舞のメロディ': ['난무의 멜로디', '란부노 멜로디', 'Ranbu no Melody'],
  'スカー': ['스카', 'Scar'],
  'メリッサ': ['멜리사', 'Melissa'],
  'READY STEADY GO': ['레디 스테디 고', 'ready steady go'],
  'リライト': ['리라이트', 'Rewrite'],
  'again': ['어게인', 'Again'],
  '嘘': ['거짓말', '우소', 'Uso'],
  'ホログラム': ['홀로그램', 'Hologram'],
  'ゴールデンタイムラバー': ['골든 타임 러버', 'Golden Time Lover'],
  'Period': ['피리어드', 'period'],
  'レイン': ['레인', 'Rain'],
  'サムライハート(Some Like It Hot!!)': ['사무라이 하트', '사무라이하트', 'Some Like It Hot', 'Samurai Heart'],
  'サムライハート': ['사무라이 하트', '사무라이하트', 'Some Like It Hot', 'Samurai Heart'],
  'Pray': ['프레이', 'pray'],
  '曇天': ['흐린 하늘', '돈텐', 'Donten'],
  'バクチ・ダンサー': ['바쿠치 댄서', 'Bakuchi Dancer'],
  '桃源郷エイリアン': ['무릉도원 에일리언', '토겐쿄 에일리언', 'Tougenkyou Alien'],
  'ジレンマ': ['딜레마', '지렌마', 'Dilemma'],
  'サクラミツツキ': ['사쿠라미츠츠키', '벚꽃만월', 'Sakura Mitsutsuki'],
  '現状ディストラクション': ['현상 디스트럭션', '현상디스트럭션', 'Genjou Destruction'],
  'KNOW KNOW KNOW': ['노우 노우 노우', 'know know know'],
  '轍〜Wadachi〜': ['바퀴자국', '와다치', 'Wadachi'],
  'イマジネーション': ['이매지네이션', 'Imagination'],
  'アイアムアヒーロー': ['아이 엠 어 히어로', 'I Am A Hero'],
  'ヒカリアレ': ['빛이 있으라', '히카리아레', 'Hikari Are'],
  'PHOENIX': ['피닉스', 'phoenix'],
  '突破口': ['돌파구', '톳파코', 'Toppakou'],
  'オレンジ': ['오렌지', 'Orange'],
  '紅蓮の弓矢': ['홍련의 화살', '홍련의화살', '구렌노 유미야', 'Guren no Yumiya'],
  '自由の翼': ['자유의 날개', '지유노 츠바사', 'Jiyuu no Tsubasa'],
  '心臓を捧げよ!': ['심장을 바쳐라!', '심장을 바쳐라', '심장을바쳐라', '신조오 사사게요', 'Shinzo wo Sasageyo'],
  '心臓を捧げよ': ['심장을 바쳐라', '심장을바쳐라', '신조오 사사게요', 'Shinzo wo Sasageyo'],
  'Red Swan': ['레드 스완', 'red swan'],
  '憧憬と屍の道': ['동경과 시체의 길', '쇼케이토 시카바네노 미치', 'Shoukei to Shikabane no Michi'],
  '僕の戦争': ['나의 전쟁', '나의전쟁', '보쿠노 센소', 'My War', 'Boku no Sensou'],
  '衝撃': ['충격', '쇼게키', 'Shock', 'Shougeki'],
  'The Rumbling': ['더 럼블링', '럼블링', 'the rumbling'],
  '悪魔の子': ['악마의 아이', '악마의아이', '아쿠마노 코', 'A Child of Evil', 'Akuma no Ko'],
  'Under the Tree': ['언더 더 트리', 'under the tree'],
  '最後の巨人': ['최후의 거인', '사이고노 쿄진', 'The Last Titan', 'Saigo no Kyojin'],
  '二千年... 若しくは... 二万年後の君へ・・・': ['2천 년 혹은 2만 년 후의 너에게', '니센넨 모시쿠와 니만넨고노 키미에'],
  'いってらっしゃい': ['다녀오세요', '잇테랏샤이', 'Itterasshai', 'See you later'],
  'unravel': ['언래블', 'Unravel'],
  '季節は次々死んでいく': ['계절은 차례차례 죽어간다', '계절은차례차례죽어간다', '키세츠와 츠기츠기 신데이쿠', 'Seasons Die One After Another', 'Kisetsu wa Tsugitsugi Shindeiku'],
  'asphyxia': ['아스픽시아', '질식', 'asphyxia'],
  'katharsis': ['카타르시스', 'katharsis'],
  'THE DAY': ['더 데이', 'the day'],
  '空に歌えば': ['하늘에 노래하면', '하늘에노래하면', '소라니 우타에바', 'Sora ni Utaeba'],
  'ODD FUTURE': ['오드 퓨처', 'odd future'],
  'ポラリス': ['폴라리스', '북극성', 'Polaris'],
  'No.1': ['넘버원', '넘버 원', 'number one'],
  'シュガーソングとビターステップ': ['슈가송과 비터스텝', '슈가송과비터스텝', '슈가 송과 비터 스텝', 'Sugar Song and Bitter Step'],
  'オリオンをなぞる': ['오리온을 덧그리다', '오리온오 나조루', 'Orion wo Nazoru'],
  'fakeshow': ['페이크쇼', 'fakeshow'],
  'カオスが極まる': ['카오스가 극에 달하다', '카오스가 키와마루', 'Chaos ga Kiwamaru'],
  '君の知らない物語': ['네가 모르는 이야기', '네가모르는이야기', '키미노 시라나이 모노가타리', 'Kimi no Shiranai Monogatari'],
  '恋愛サーキュレーション': ['연애 서큘레이션', '연애서큘레이션', '렌아이 서큘레이션', 'Renai Circulation'],
  '白金ディスコ': ['백금 디스코', '플래티넘 디스코', '하쿠킨 디스코', 'Platinum Disco'],
  'staple stable': ['스테이플 스테이블', 'staple stable'],
  '帰り道': ['귀갓길', '카에리미치', 'Kaerimichi'],
  'ambivalent world': ['앰비벌런트 월드', 'ambivalent world'],
  '妄想エクスプレス': ['망상 익스프레스', '모소 익스프레스', 'Mousou Express'],
  'コネクト': ['커넥트', 'Connect', 'connect'],
  'ルミナス': ['루미너스', 'Luminous'],
  'カラフル': ['컬러풀', 'Colorful'],
  'ヒトリゴト': ['혼잣말', '히토리고토', 'Hitorigoto'],
  'ナイショの話': ['비밀 이야기', '나이쇼노 하나시', 'Naisho no Hanashi'],
  'irony': ['아이러니', 'irony'],
  'ALIVE': ['얼라이브', 'alive'],
  'Magia': ['마기아', 'magia'],
  'to the beginning': ['투 더 비기닝', 'to the beginning'],
  '満天': ['만천', '만텐', 'Manten'],
  'heavenly blue': ['헤븐리 블루', 'heavenly blue'],
  'believe': ['빌리브', 'believe'],
  'ring your bell': ['링 유어 벨', 'ring your bell'],
  'only my railgun': ['온리 마이 레일건', '온리마이레일건', 'Only My Railgun'],
  'Only My Railgun': ['온리 마이 레일건', '온리마이레일건', 'Only My Railgun'],
  'LEVEL5-judgelight-': ['레벨5 저지라이트', '레벨 5 저지라이트', '레벨5', 'level5 judgelight'],
  'future gazer': ['퓨처 게이저', 'future gazer'],
  'sister\'s noise': ['시스터즈 노이즈', '시스터스 노이즈', 'sisters noise'],
  'eternal reality': ['이터널 리얼리티', 'eternal reality'],
  'black bullet': ['블랙 불릿', 'black bullet'],
  'final phase': ['파이널 페이즈', 'final phase'],
  'God knows...': ['갓 노우즈', '갓노우즈', 'God knows'],
  'God knows': ['갓 노우즈', '갓노우즈', 'God knows'],
  'Lost my music': ['로스트 마이 뮤직', 'lost my music'],
  'ハレ晴レユカイ': ['맑고 맑게 유쾌하게', '하레하레 유카이', 'Hare Hare Yukai'],
  '冒険でしょでしょ?': ['모험이잖아 그렇지', '보우켄데쇼데쇼', 'Bouken Desho Desho'],
  'Super Driver': ['슈퍼 드라이버', 'super driver'],
  'Cagayake!GIRLS': ['카가야케 걸즈', 'cagayake girls'],
  'Don\'t say "lazy"': ['돈 세이 레이지', '돈세이레이지', 'dont say lazy'],
  'GO! GO! MANIAC': ['고고 매니악', '고고매니악', 'go go maniac'],
  'Listen!!': ['리슨', 'listen'],
  'Utauyo!!MIRACLE': ['우타우요 미라클', 'utauyo miracle'],
  'NO,Thank You!': ['노 땡큐', '노땡큐', 'no thank you'],
  'ふわふわ時間': ['푹신푹신 타임', '후와후와 타임', 'Fuwa Fuwa Time'],
  '天使にふれたよ!': ['천사를 만났어', '천사를만났어', '텐시니 후레타요', 'Tenshi ni Fureta yo'],
  'ごはんはおかず': ['밥은 반찬', '고항와 오카즈', 'Gohan wa Okazu'],
  'わたしの恋はホッチキス': ['나의 사랑은 호치키스', '와타시노 코이와 호치키스', 'Watashi no Koi wa Hotchkiss'],
  'ふでペン 〜ボールペン〜': ['붓펜 볼펜', '후데펜 볼펜', 'Fude Pen Ball Pen'],
  'Hacking to the Gate': ['해킹 투 더 게이트', 'hacking to the gate'],
  'スカイクラッドの観測者': ['스카이클래드의 관측자', '스카이클래드', 'Skyclad no Kansokusha'],
  'ファティマ': ['파티마', 'Fatima'],
  'アマデウス': ['아마데우스', 'Amadeus'],
  '名前のない怪物': ['이름 없는 괴물', '나마에노 나이 카이부츠', 'Namae no Nai Kaibutsu', 'The Monster With No Name'],
  'All Alone With You': ['올 얼론 위드 유', 'all alone with you'],
  'Departures 〜あなたにおくるアイの歌〜': ['디파처스', 'Departures'],
  'The Everlasting Guilty Crown': ['디 에버래스팅 길티 크라운', 'the everlasting guilty crown'],
  'My Dearest': ['마이 디어리스트', 'my dearest'],
  '告白': ['고백', '코쿠하쿠', 'Kokuhaku'],
  '君の神話〜アクエリオン第二章': ['너의 신화', '키미노 신와', 'Kimi no Shinwa'],
  '創聖のアクエリオン': ['창성의 아쿠에리온', '소세이노 아쿠에리온', 'Genesis of Aquarion', 'Sousei no Aquarion'],
  '鳥の詩': ['새의 시', '토리노 우타', 'Tori no Uta'],
  'だんご大家族': ['경단 대가족', '당고 대가족', '단고 다이가조쿠', 'Dango Daikazoku'],
  '時を刻む唄': ['시간을 새기는 노래', '토키오 키자무 우타', 'Toki wo Kizamu Uta'],
  'My Soul, Your Beats!': ['마이 소울 유어 비츠', 'my soul your beats'],
  '一番の宝物': ['가장 소중한 보물', '이치반노 타카라모노', 'Ichiban no Takaramono'],
  'Crow Song': ['크로우 송', 'crow song'],
  'Alchemy': ['알케미', 'alchemy'],
  'Little Braver': ['리틀 브레이버', 'little braver'],
  'This game': ['디스 게임', 'this game'],
  'THERE IS A REASON': ['데어 이즈 어 리즌', 'there is a reason'],
  'Redo': ['리두', 'redo'],
  'STYX HELIX': ['스틱스 헬릭스', 'styx helix'],
  'Paradisus-Paradoxum': ['파라디수스 파라독숨', 'paradisus paradoxum'],
  'Stay Alive': ['스테이 얼라이브', 'stay alive'],
  'Realize': ['리얼라이즈', 'realize'],
  'Memento': ['메멘토', 'memento'],
  'Long shot': ['롱 샷', 'long shot'],
  '光るなら': ['빛난다면', '히카루나라', 'Hikaru Nara'],
  'キラメキ': ['반짝임', '키라메키', 'Kirameki'],
  'secret base 〜君がくれたもの〜': ['시크릿 베이스', '네가 준 것', 'secret base', 'Kimi ga Kureta Mono'],
  'サークルゲーム': ['서클 게임', 'Circle Game'],
  '青い栞': ['푸른 책갈피', '아오이 시오리', 'Aoi Shiori'],
  '花の塔': ['꽃의 탑', '하나노 토우', '하나노 토', 'Hana no Tou', 'Tower of Flower'],
  'ミカヅキ': ['초승달', '미카즈키', 'Mikazuki'],
  '平行線': ['평행선', '헤이코우센', 'Heikousen'],
  'チキチキバンバン': ['치키치키 뱅뱅', '치키치키방방', 'Chitty Chitty Bang Bang', 'Chikichiki Banban'],
  '気分上々↑↑': ['기분상승', '키분죠죠', 'Kibun Joujou'],
  'メフィスト': ['메피스토', 'Mephisto'],
  'サインはB': ['사인은 B', '사인은B', 'Sign is B', 'Sign wa B'],
  'STAR☆T☆RAIN': ['스타 티 레인', '스타트레인', 'Star T Rain'],
  'POP IN 2': ['팝 인 투', 'pop in 2'],
  'ファタール': ['파탈', '파타르', 'Fatal'],
  'Burning': ['버닝', 'burning'],
  'ちゅ、多様性。': ['츄 다양성', '츄다양성', 'Chu, Tayousei', 'Chu Tayousei'],
  '普変': ['보변', '후헨', 'Fuhen'],
  '刃渡り2億センチ': ['칼날 길이 2억 센티', '하와타리 2억 센치', 'Hawatari Nioku Centi'],
  '錠剤': ['정제', '알약', '죠자이', 'Jouzai'],
  'first death': ['퍼스트 데스', 'first death'],
  '青のすみか': ['푸름의 거처', '푸름의거처', '아오노 스미카', 'Where Our Blue Is', 'Ao no Sumika'],
  '燈': ['등불', '아카리', 'Akari'],
  'VIVID VICE': ['비비드 바이스', 'vivid vice'],
  'LOST IN PARADISE': ['로스트 인 파라다이스', 'lost in paradise'],
  'give it back': ['기브 잇 백', 'give it back'],
  'more than words': ['모어 댄 워즈', 'more than words'],
  'Anytime Anywhere': ['애니타임 애니웨어', 'anytime anywhere'],
  '花になって': ['꽃이 되어', '하나니 낫테', 'Hana ni Natte', 'Be a flower'],
  'アンビバレント': ['앰비벌런트', 'Ambivalent'],
  'Bling-Bang-Bang-Born': ['블링뱅뱅본', '블링 뱅 뱅 본', 'bling bang bang born'],
  '二度寝': ['두 번 자기', '두번자기', '니도네', 'Nidone'],
  'オトノケ': ['오토노케', 'Otonoke'],
  'TAIDADA': ['타이다다', 'taidada'],
  'よふかしのうた': ['철야의 노래', '요후카시노 우타', 'Yofukashi no Uta'],
  '堕天': ['타천', '다텐', 'Daten'],
  'ロスタイム': ['로스타임', 'Loss Time'],
  'のびしろ': ['발전 가능성', '노비시로', 'Nobishiro'],
  '怪獣': ['괴수', '카이쥬', 'Kaiju'],
  'Nobody': ['노바디', 'nobody'],
  'Abyss': ['어비스', 'abyss'],
  'Get Wild': ['겟 와일드', '겟와일드', 'get wild'],
  '君が好きだと叫びたい': ['너를 좋아한다고 외치고 싶어', '너를좋아한다고외치고싶어', '키미가 스키다토 사케비타이', 'Kimi ga Suki da to Sakebitai'],
  '世界が終るまでは…': ['세계가 끝날 때까지는', '세계가끝날때까지는', '세카이가 오와루 마데와', 'Sekai ga Owaru Made wa'],
  '第ゼロ感': ['제0감', '다이제로칸', 'Dai Zero Kan'],
  'LOVE ROCKETS': ['러브 로켓츠', 'love rockets'],
  '運命のルーレット廻して': ['운명의 룰렛을 돌려줘', '운명의 룰렛', '운명의룰렛', 'Unmei no Roulette Mawashite'],
  '謎': ['수수께끼', '나조', 'Nazo'],

  // --- Song Titles: City Pop & J-Pop Legends ---
  '真夜中のドア〜Stay With Me': ['한밤중의 도어', '마요나카노 도어', 'Stay With Me', 'Mayonaka no Door'],
  'Stay With Me': ['스테이 위드 미', '한밤중의 도어', 'stay with me'],
  'プラスティック・ラブ': ['플라스틱 러브', '플라스틱러브', 'Plastic Love'],
  'Plastic Love': ['플라스틱 러브', '플라스틱러브', 'plastic love'],
  'クリスマス・イブ': ['크리스마스 이브', 'Christmas Eve'],
  'RIDE ON TIME': ['라이드 온 타임', 'ride on time'],
  'フライディ・チャイナタウン': ['프라이데이 차이나타운', '플라이데이 차이나타운', 'Flyday Chinatown'],
  '丸の内サディスティック': ['마루노우치 새디스틱', '마루노우치새디스틱', 'Marunouchi Sadistic'],
  '丸ノ内サディスティック': ['마루노우치 새디스틱', '마루노우치새디스틱', 'Marunouchi Sadistic'],
  '本能': ['본능', '혼노', 'Honnou'],
  'ギブス': ['깁스', 'Gips'],
  '罪と罰': ['죄와 벌', '츠미토 바츠', 'Crime and Punishment', 'Tsumi to Batsu'],
  '歌舞伎町の女王': ['가부키초의 여왕', '카부키쵸노 죠오', 'Queen of Kabukicho'],
  '長く短い祭': ['길고 짧은 축제', '나가쿠 미지카이 마츠리', 'Nagaku Mijikai Matsuri'],
  '群青日和': ['군청일화', '군조비요리', 'Gunjou Biyori'],
  '閃光少女': ['섬광소녀', '센코쇼죠', 'Senkou Shoujo'],
  '能動的三分間': ['능동적 3분간', 'Active 3 Minutes'],
  '雪の華': ['눈의 꽃', '눈의꽃', '유키노 하나', '유키노하나', 'Yuki no Hana'],
  '僕が死のうと思ったのは': ['내가 죽으려고 생각한 것은', '내가죽으려고생각한것은', '보쿠가 시노우토 오모옷타노와', '보쿠가 시노우토 오못타노와', 'Boku ga Shinou to Omotta no wa'],
  '瞳をとじて': ['눈을 감고', '히토미오 토지테', 'Hitomi wo Tojite'],
  'さくらんぼ': ['사쿠란보', '앵두', 'Sakuranbo', 'sakuranbo'],
  'プラネタリウム': ['플라네타리움', 'Planetarium'],
  '金魚花火': ['금붕어 불꽃', '킨교 하나비', 'Kingyo Hanabi'],
  '恋愛写真': ['연애사진', '렌아이 샤신', 'Renai Shashin'],
  '奏(かなで)': ['카나데', '연주', 'Kanade'],
  '奏': ['카나데', 'Kanade', 'kanade'],
  '全力少年': ['전력소년', '젠료쿠 쇼넨', 'Zenryoku Shounen'],
  '小さな恋のうた': ['작은 사랑의 노래', '작은사랑의노래', '치이사나 코이노 우타', '치이사나코이노우타', 'Chiisana Koi no Uta'],
  'あなたに': ['당신에게', '아나타니', 'Anata ni'],
  'チェリー': ['체리', 'Cherry'],
  'ロビンソン': ['로빈슨', 'Robinson'],
  '空も飛べるはず': ['하늘도 날 수 있을 거야', '하늘도날수있을거야', '소라모 토베루 하즈', 'Sora mo Toberu Hazu'],
  '楓': ['단풍', '카에데', 'Kaede'],
  '美しい鰭': ['아름다운 지느러미', '우츠쿠시이 히레', 'Utsukushii Hire'],
  '天体観測': ['천체관측', '텐타이칸소쿠', '텐타이 칸소쿠', 'Tentai Kansoku'],
  'カルマ': ['카르마', '업', 'Karma'],
  '車輪の唄': ['수레바퀴의 노래', '샤린노 우타', 'Sharin no Uta'],
  '花の名': ['꽃의 이름', '하나노 나', 'Hana no Na'],
  'ray': ['레이', 'ray'],
  'Hello,world!': ['헬로 월드', 'hello world'],
  'アカシア': ['아카시아', 'Acacia'],
  'なないろ': ['일곱 빛깔', '나나이로', 'Nanairo'],
  'クロノスタシス': ['크로노스타시스', 'Chronostasis'],
  'SOUVENIR': ['수베니어', 'souvenir'],
  'Sleep Walking Orchestra': ['슬립 워킹 오케스트라', 'sleep walking orchestra'],
  '新宝島': ['신보물섬', '신타카라지마', 'Shin Takarajima'],
  'アイデンティティ': ['아이덴티티', 'Identity'],
  '忘れられないの': ['잊을 수 없는걸', '와스레라레나이노', 'Wasurerarenaino'],
  '夜の踊り子': ['밤의 무희', '요루노 오도리코', 'Yoru no Odoriko'],
  '完全感覚Dreamer': ['완전감각 드리머', '완전감각드리머', 'Kanzen Kankaku Dreamer'],
  'Wherever you are': ['웨어에버 유 아', 'wherever you are'],
  'The Beginning': ['더 비기닝', 'the beginning'],
  'We are': ['위 아', 'we are'],
  'Stand Out Fit In': ['스탠드 아웃 핏 인', 'stand out fit in'],
  'Wasted Nights': ['웨이스티드 나이츠', 'wasted nights'],
  'Renegades': ['레니게이즈', 'renegades'],
  'RPG': ['알피지', 'rpg'],
  'Dragon Night': ['드래곤 나이트', 'dragon night'],
  'スターライトパレード': ['스타라이트 퍼레이드', 'Starlight Parade'],
  '眠り姫': ['잠자는 공주', '네무리히메', 'Nemurihime'],
  'スノーマジックファンタジー': ['스노우 매직 판타지', 'Snow Magic Fantasy'],
  '炎と森のカーニバル': ['불꽃과 숲의 카니발', '호노오토 모리노 카니발', 'Flame and Forest Carnival'],
  'RAIN': ['레인', 'rain'],
  'サザンカ': ['애기동백', '사잔카', 'Sazanka'],
  'Habit': ['해빗', 'habit'],
  'さよならエレジー': ['안녕 엘레지', '사요나라 엘레지', 'Sayonara Elegy'],
  'まちがいさがし': ['틀린 그림 찾기', '틀린그림찾기', '마치가이사가시', '마치가이사가지', 'Machigaisagashi'],
  '虹': ['무지개', '니지', 'Niji'],
  '愛をこめて花束を': ['사랑을 담아 꽃다발을', '아이오 코메테 하나타바오', 'Ai wo Komete Hanataba wo'],
  'タマシイレボリューション': ['타마시이 레볼루션', '영혼 레볼루션', 'Tamashii Revolution'],
  'キセキ': ['기적', '키세키', 'Kiseki'],
  '愛唄': ['사랑 노래', '아이우타', 'Ai Uta'],
  '遥か': ['아득히', '하루카', 'Haruka'],
  'ありがとう': ['고마워', '아리가토', 'Arigatou'],
  '気まぐれロマンティック': ['변덕스러운 로맨틱', '키마구레 로맨틱', 'Kimagure Romantic'],
  'YELL': ['옐', 'yell'],
  'じょいふる': ['조이풀', 'Joyful'],
  '栄光の架橋': ['영광의 가교', '에이코노 카케하시', 'Eikou no Kakehashi'],
  '夏色': ['여름색', '나츠이로', 'Natsuiro'],
  '表裏一体': ['표리일체', '효리잇타이', 'Hyouri Ittai'],
  'アポロ': ['아폴로', 'Apollo'],
  'サウダージ': ['사우다지', 'Saudade'],
  'アゲハ蝶': ['호랑나비', '아게하쵸', 'Agehachou'],
  'ミュージック・アワー': ['뮤직 아워', 'Music Hour'],
  'オー！リバル': ['오! 리발', '오 리발', 'Oh! Rival'],
  'ないものねだり': ['없는 것을 조르기', '없는것을조르기', '없는 것 조르기', '나이모노네다리', 'Naimononedari'],
  'フルドライブ': ['풀 드라이브', 'Full Drive'],
  'バトンロード': ['바톤 로드', 'Baton Road'],
  'ソングライアー': ['송 라이어', 'Song Liar'],
  'ソラニン': ['소라닌', 'Solanin'],
  'Mela!': ['멜라!', '멜라', '메라', 'Mela', 'mela'],
  'Shout Baby': ['샤우트 베이비', 'shout baby'],
  'キャラクター': ['캐릭터', 'Character'],
  'サマータイムシンデレラ': ['서머타임 신데렐라', 'Summertime Cinderella'],
  '晩餐歌': ['반산카', 'Bansanka', 'bansanka', '만찬가'],
  '一輪花': ['일륜화', '한 송이 꽃', '이치린카', 'Ichirinka'],
  'サクラキミワタシ': ['벚꽃 너 나', '사쿠라 키미 와타시', 'Sakura Kimi Watashi'],
  '地獄恋文': ['지옥연문', '지고쿠 코이부미', 'Jigoku Koibumi'],
  'ひゅるりらぱっぱ': ['휴루리라팟파', 'Hyururirapappa'],
  'Overdose': ['오버도즈', '오버더스', 'overdose'],
  '猿芝居': ['원숭이 연극', '사루시바이', 'Sarushibai'],
  'フライデー・ナイト': ['프라이데이 나이트', 'Friday Night'],
  '金木犀': ['금목서', '킨모쿠세이', 'Kinmokusei'],
  '絶対零度': ['절대영도', '젯타이 레이도', 'Absolute Zero', 'Zettai Reido'],
  '糸電話': ['실전화', '이토덴와', 'Itodenwa'],
  'オトナブルー': ['오토나 블루', '어른 블루', 'Otona Blue'],
  'Tokyo Calling': ['도쿄 콜링', 'tokyo calling'],
  '幾億光年': ['수억 광년', '이쿠오쿠 코넨', 'Ikuoku Kounen', 'Billions of Light Years'],
  '恋人ごっこ': ['연인 놀이', '코이비토 곳코', 'Koibito Gokko'],
  'なんでもないよ、': ['아무것도 아니야', '난데모 나이요', 'Nandemonaiyo'],
  'リンジュー・ラブ': ['임종 러브', '린쥬 러브', 'Rinjuu Love'],
  'シンデレラボーイ': ['신데렐라 보이', 'Cinderella Boy'],
  'いつか': ['언젠가', '이츠카', 'Itsuka'],
  '結': ['결', '유이', 'Yui'],
  '魔法にかけられて': ['마법에 걸려서', '마호니 카케라레테', 'Mahou ni Kakerarete'],
  '別の人の彼女になったよ': ['다른 사람의 여자친구가 됐어', '베츠노 히토노 카노죠니 낫타요'],
  '恋だろ': ['사랑이잖아', '코이다로', 'Koidaro'],
  '猫': ['고양이', '네코', 'Neko'],
  'CITRUS': ['시트러스', 'citrus'],
  'スターマイン': ['스타마인', 'Starmine'],
  'I wonder': ['아이 원더', 'i wonder'],
  'Walking with you': ['워킹 위드 유', 'walking with you'],
  'ツキミソウ': ['달맞이꽃', '츠키미소', 'Tsukimisou'],
  '愛とか恋とか': ['사랑이라든가 연애라든가', '아이토카 코이토카', 'Ai toka Koi toka'],
  'W/X/Y': ['더블유엑스와이', 'wxy', 'w x y'],
  'Stand by me, Stand by you.': ['스탠 바이 미 스탠 바이 유', 'stand by me stand by you'],
  '題名のない今日': ['제목 없는 오늘', '다이메이노 나이 쿄우'],
  '香水': ['향수', '코우스이', 'Kousui'],
  'ぎゅっと。': ['꽉', '귯토', 'Gyutto'],
  'Myra': ['마이라', 'myra'],
  '春を告げる': ['봄을 고하다', '하루오 츠게루', 'Haru wo Tsugeru'],
  '麻痺': ['마비', '마히', 'Mahi'],
  '色彩': ['색채', '시키사이', 'Shikisai'],
  'ヨワネハキ': ['약한 소리', '요와네하키', 'Yowanehaki'],
  'トウキョウ・シャンディ・ランデヴ': ['도쿄 샨디 랑데부', 'Tokyo Shandy Rendez-vous'],
  'なにやってもうまくいかない': ['뭘 해도 잘 안 돼', '나니 얏테모 우마쿠 이카나이'],
  'PAKU': ['파쿠', 'paku'],
  '貴方の恋人になりたい': ['당신의 연인이 되고 싶어', '아나타노 코이비토니 나리타이'],
  'すきっちゅーの!': ['좋아한다니까!', '스키츄노', 'Suki Chuuno'],
  '可愛くてごめん': ['귀여워서 미안해', '귀여워서미안해', '카와이쿠테 고멘', 'Kawaikute Gomen'],
  'ファンサ': ['팬서비스', '판사', 'Fansa'],
  '誇り高きアイドル': ['긍지 높은 아이돌', '호코리 타카키 아이돌', 'Hokori Takaki Idol'],
  '私、アイドル宣言': ['나, 아이돌 선언', '와타시 아이돌 선언', 'Watashi Idol Sengen'],
  '金曜日のおはよう': ['금요일의 아침 인사', '킨요비노 오하요', 'Kinyoubi no Ohayou'],
  '世界は恋に落ちている': ['세계는 사랑에 빠져있어', '세카이와 코이니 오치테 이루', 'Sekai wa Koi ni Ochiteiru'],
  'プライド革命': ['프라이드 혁명', 'Pride Kakumei'],
  'アイのシナリオ': ['사랑의 시나리오', '아이노 시나리오', 'Ai no Scenario'],
  'ロメオ': ['로미오', 'Romeo'],
  '東京サマーセッション': ['도쿄 서머 세션', 'Tokyo Summer Session'],
  '可愛くなりたい': ['귀여워지고 싶어', '카와이쿠 나리타이', 'Kawaiku Naritai'],
  'Garden': ['가든', 'garden'],

  // --- Song Titles: Vocaloid Classics & Project Sekai ---
  'みくみくにしてあげる♪': ['미쿠미쿠하게 해줄게', '미쿠미쿠니 시테아게루', 'Miku Miku ni Shite Ageru'],
  'メルト': ['멜트', 'Melt'],
  'ワールドイズマイン': ['월드 이즈 마인', '월드이즈마인', 'World is Mine'],
  'ブラック★ロックシューター': ['블랙 록 슈터', '블랙록슈터', 'Black Rock Shooter'],
  '恋は戦争': ['사랑은 전쟁', '코이와 센소', 'Love is War', 'Koi wa Sensou'],
  '初音ミクの消失': ['하츠네 미쿠의 소실', '하츠네미쿠의소실', '소실', '하츠네 미쿠노 쇼시츠', 'The Disappearance of Hatsune Miku'],
  'ロミオとシンデレラ': ['로미오와 신데렐라', '로미오토 신데렐라', 'Romeo and Cinderella'],
  '炉心融解': ['노심융해', '로신유카이', 'Meltdown', 'Roshin Yuukai'],
  'ダブルラリアット': ['더블 래리어트', '더블래리어트', 'Double Lariat'],
  'Just Be Friends': ['저스트 비 프렌즈', 'just be friends'],
  'magnet': ['마그넷', 'magnet'],
  '裏表ラバーズ': ['표리 러버즈', '겉과 속이 다른 러버즈', '우라오모테 러버즈', 'Two-Faced Lovers', 'Ura-Omote Lovers'],
  'ローリンガール': ['롤링 걸', '롤링걸', 'Rolling Girl'],
  'ワールズエンド・ダンスホール': ['월즈 엔드 댄스홀', '월즈엔드 댄스홀', 'World\'s End Dancehall'],
  'アンハッピーリフレイン': ['언해피 리프레인', 'Unhappy Refrain'],
  'アンノウン・マザーグース': ['언노운 마더구스', '언노운마더구스', '언노운 마더 구스', 'Unknown Mother-Goose'],
  'Tell Your World': ['텔 유어 월드', '텔유어월드', 'tell your world'],
  '千本桜': ['천본앵', '센본자쿠라', 'Senbonzakura'],
  'モザイクロール': ['모자이크 롤', '모자이크롤', 'Mozaik Role', 'Mosaic Roll'],
  '弱虫モンブラン': ['겁쟁이 몽블랑', '요와무시 몽블랑', 'Coward Montblanc', 'Yowamushi Montblanc'],
  '愛言葉': ['사랑의 말', '아이코토바', 'Love Words', 'Ai Kotoba'],
  '二息歩行': ['이속보행', '니소쿠호코', 'Two Breaths Walking', 'Nisoku Hokou'],
  'ストリーミングハート': ['스트리밍 하트', 'Streaming Heart'],
  'ゴーストルール': ['고스트 룰', '고스트룰', 'Ghost Rule'],
  'リバーシブル・キャンペーン': ['리버시블 캠페인', 'Reversible Campaign'],
  '妄想感傷代償連盟': ['망상감상대상연맹', '모소칸쇼다이쇼렌메이', 'Delusion Sensation Compensation Federation', 'Mousou Kanshou Daishou Renmei'],
  'ヒバナ': ['히바나', '불꽃', 'Hibana'],
  '乙女解剖': ['오토메 해부', '소녀 해부', '오토메 카이보', 'Otome Dissection', 'Otome Kaibou'],
  'アンドロイドガール': ['안드로이드 걸', 'Android Girl'],
  'ヴァンパイア': ['뱀파이어', 'Vampire'],
  'シンデレラ': ['신데렐라', 'Cinderella'],
  'サラマンダー': ['샐러맨더', '살라만더', 'Salamander'],
  'アニマル': ['애니멀', 'Animal'],
  'ラビットホール': ['래빗 홀', '래빗홀', 'Rabbit Hole'],
  'ボルテッカー': ['볼트태클', '볼테커', 'Volt Tackle'],
  'ハオ': ['하오', 'Hao'],
  'モニタリング': ['모니터링', 'Monitoring'],
  '砂の惑星': ['모래의 행성', '모래의행성', '스나노 와쿠세이', 'Sand Planet', 'DUNE'],
  'マトリョシカ': ['마트료시카', 'Matryoshka'],
  'ドーナツホール': ['도넛 홀', '도넛홀', 'Donut Hole'],
  'パンダヒーロー': ['판다 히어로', '판다히어로', 'Panda Hero'],
  '結ンデ開イテ羅刹ト屍': ['맺고 풀고 나찰과 송장', '무슨데 히라이테 라세츠토 시카바네', 'Hold, Release; Rakshasa and Carcasses'],
  'ロストワンの号哭': ['로스트원의 호곡', '로스트원의호곡', 'The Lost One\'s Weeping', 'Lost One no Goukoku'],
  '脱法ロック': ['탈법 록', '탈법록', '탈법 락', 'Law-evading Rock', 'Dappou Rock'],
  '東京テディベア': ['도쿄 테디베어', '도쿄테디베어', 'Tokyo Teddy Bear'],
  '再教育': ['재교육', '사이쿄이쿠', 'Re-education'],
  '六兆年と一夜物語': ['육조 년과 하룻밤 이야기', '육조년과 하룻밤 이야기', '로쿠쵸넨토 이치야 모노가타리', 'A Tale of Six Trillion Years and a Night'],
  '地球最後の告白を': ['지구 최후의 고백을', '지구최후의고백을', '치큐 사이고노 코쿠하쿠오', 'The Earth\'s Final Confession'],
  'インビジブル': ['인비저블', '인비지블', 'Invisible'],
  '人生リセットボタン': ['인생 리셋 버튼', '진세이 리셋 버튼', 'Life Reset Button'],
  'イカサマライフゲイム': ['사기꾼 라이프 게임', '이카사마 라이프 게임', 'ikAsAma Life Game'],
  'カミサマネジマキ': ['신님 태엽감기', '카미사마 네지마키', 'Kamisama Nejimaki'],
  '敗北の少年': ['패배의 소년', '하이보쿠노 쇼넨', 'Defeat Boy', 'Haiboku no Shounen'],
  '神っぽいな': ['신 같네', '카미뽀이나', '카미포이나', 'God-ish', 'Kamippoina'],
  'ノンブレス・オブリージュ': ['논브레스 오블리주', '논브레스오블리주', 'Non-breath oblige'],
  'ノンブレス・オムリージュ': ['논브레스 오블리주', '논브레스오블리주', 'Non-breath oblige'],
  '転生林檎': ['전생사과', '텐세이 링고', 'Reincarnation Apple', 'Tensei Ringo'],
  '匿名M': ['익명M', '익명 엠', '토쿠메이 M', 'Anonymous M'],
  'すろぉもぉしょん': ['슬로우 모션', 'SlowMotion'],
  'ありふれたせかいせいふく': ['흔해빠진 세계정복', 'Common World Domination'],
  'KING': ['킹', 'king'],
  'QUEEN': ['퀸', 'queen'],
  'エンヴィーベイビー': ['엔비 베이비', '엔비베이비', 'Envy Baby'],
  'EYE': ['아이', 'eye'],
  '酔いどれ知らず': ['주정뱅이인 줄 모르고', '요이도레 시라즈', 'Yoidore Shirazu'],
  'レクイエム': ['레퀴엠', 'Requiem'],
  'グッバイ宣言': ['굿바이 선언', '굿바이선언', '구바이 선언', 'Goodbye Sengen', 'Goodbye Declaration'],
  'ビターチョコデコレーション': ['비터 초코 데코레이션', '비터초코 데코레이션', 'Bitter Choco Decoration'],
  'キュートなカノジョ': ['귀여운 그녀', '큐트한 그녀', '큐토나 카노죠', 'Cute Girlfriend', 'Cute Na Kanojo'],
  '爆笑': ['폭소', '바쿠쇼', 'Bakushou'],
  'チルドレンレコード': ['칠드런 레코드', '칠드런레코드', 'Children Record'],
  'カゲロウデイズ': ['아지랑이 데이즈', '아지랑이데이즈', '카게로우 데이즈', 'Kagerou Daze'],
  '夜咄ディセイブ': ['야화 디세이브', '요바나시 디세이브', 'Yobanashi Deceive'],
  'サマータイムレコード': ['서머타임 레코드', '서머타임레코드', 'Summertime Record'],
  'アウターサイエンス': ['아우터 사이언스', '아우터사이언스', 'Outer Science'],
  'ロスタイムメモリー': ['로스타임 메모리', '로스타임메모리', 'Lost Time Memory'],
  'FREELY TOMORROW': ['프릴리 투모로우', '프리리 투모로우', 'freely tomorrow'],
  'ビバハピ': ['비바해피', '비바 해피', 'Viva Happy'],
  'ロキ': ['로키', 'Roki'],
  'いーあるふぁんくらぶ': ['이얼 판클럽', '이얼판클럽', '1 2 Fanclub', '1, 2 Fanclub'],
  '少女レイ': ['소녀 레이', '소녀레이', '쇼죠 레이', 'Shoujo Rei', 'Ghost Girl'],
  '脳漿炸裂ガール': ['뇌장작열 걸', '노쇼사쿠레츠 걸', 'Brain Fluid Explosion Girl', 'Noushou Sakuretsu Girl'],
  '天ノ弱': ['아마노자쿠', '천성약함', '심술쟁이', 'Amanojaku'],
  'からくりピエロ': ['꼭두각시 피에로', '카라쿠리 피에로', 'Karakuri Pierrot'],
  '恋愛裁判': ['연애재판', '렌아이 사이반', 'Love Trial', 'Renai Saiban'],
  'ウミユリ海底譚': ['바다나리 해저담', '우미유리 해저담', '우미유리 카이테이탄', 'Tale of the Deep-sea Lily', 'Umiyuri Kaiteitan'],
  '夜明けと蛍': ['새벽과 반딧불이', '요아케토 호타루', 'Dawn and Fireflies', 'Yoake to Hotaru'],
  'シャルル': ['샤를', 'Charles'],
  '雨とペトラ': ['비와 페트라', '아메토 페트라', 'Rain and Petra', 'Ame to Petra'],
  '命に嫌われている。': ['생명에게 미움받고 있어', '생명에게미움받고있어', '이노치니 키라와레테 이루', 'Hated by Life Itself', 'Inochi ni Kirawareteiru'],
  'アスノヨゾラ哨戒班': ['내일의 밤하늘 초계반', '아스노 요조라 쇼카이한', 'Night Sky Patrol of Tomorrow', 'Asu no Yozora Shoukaihan'],
  'DAYBREAK FRONTLINE': ['데이브레이크 프론트라인', 'daybreak frontline'],
  'エイリアンエイリアン': ['에일리언 에일리언', 'Alien Alien'],
  'ダンスロボットダンス': ['댄스 로봇 댄스', 'Dance Robot Dance'],
  '太陽系デスコ': ['태양계 디스코', '타이요케이 디스코', 'Solar System Disco', 'Taiyoukei Disco'],
  '惑星ループ': ['행성 루프', '와쿠세이 루프', 'Planet Loop', 'Wakusei Loop'],
  'チュルリラ・チュルリラ・ダッダッダ!': ['츄르리라 츄르리라 닷닷다', 'Chururira Chururira Daddadda'],
  'ベノム': ['베놈', 'Venom'],
  'ダーリンダンス': ['달링 댄스', '달링댄스', 'Darling Dance'],
  '失敗作少女': ['실패작 소녀', '싯파이사쿠 쇼죠', 'Failure Girl'],
  'フォニイ': ['포니', 'Phony'],
  'ロウワー': ['로워', 'Lower', 'Lower one\'s eyes'],
  'トリコロージュ': ['트리콜로주', 'Tricologe'],
  'ジャンキーナイトタウンオーケストラ': ['정키 나이트 타운 오케스트라', 'Junky Nighttown Orchestra'],
  'テレキャスタービーボーイ': ['텔레캐스터 비보이', 'Telecaster B-Boy'],
  'エゴロック': ['에고 록', '에고록', 'Ego Rock'],
  'ラヴィ': ['라비', 'Lavie'],
  'トンデモワンダーズ': ['터무니없는 원더즈', '톤데모 원더즈', 'Tondemo Wonders'],
  'にっこり^^調査隊のテーマ': ['생긋 조사대의 테마', '닛코리 조사대의 테마', 'Niccori Survey Team Theme'],
  'シネマ': ['시네마', 'Cinema'],
  '威風堂々': ['위풍당당', '이후도도', 'Ifuudoudou', 'Pomp and Circumstance'],
  '劣等上等': ['열등상등', '렛토죠토', 'BRING IT ON', 'Bring It On', 'Rettou Joutou'],
  'CH4NGE': ['체인지', 'change'],
  'Beyond the way': ['비욘드 더 웨이', 'beyond the way'],
  '強風オールバック': ['강풍 올백', '강풍올백', '쿄후 올백', 'Kyofuu All Back'],
  '寝起きヤシの木': ['자고 일어난 야자수', '네오키 야시노키', 'Neoki Yashi no Ki'],
  'きゅうくらりん': ['큐쿠라린', 'Kyu-kurarin', 'Kyukurarin'],
  'ラグトレイン': ['래그트레인', '라그트레인', 'Lagtrain'],
  'オーバーライド': ['오버라이드', 'Override'],
  'メズマライザー': ['메스머라이저', '메즈마라이저', 'Mesmerizer'],
  '愛して愛して愛して': ['사랑해줘 사랑해줘 사랑해줘', '아이시테 아이시테 아이시테', 'Love Me, Love Me, Love Me', 'Aishite Aishite Aishite'],
  'バグ': ['버그', 'Bug'],
  'ヴィラン': ['빌런', 'Villain'],
  'ジェヘナ': ['게헨나', '제헤나', 'Gehenna'],
  'ザムザ': ['잠자', 'Zamsa', 'Samsa'],
  'キティ': ['키티', 'Kitty'],
  '演劇': ['연극', '엔게키', 'Engeki', 'Theater'],

  // --- Song Titles: VTuber Hits ---
  'ビビデバ': ['비비디바', '비비데바', 'BIBBIDIBA', 'Bibbidiba', 'bibbidiba'],
  'Stellar Stellar': ['스텔라 스텔라', '스텔라스텔라', 'stellar stellar'],
  'NEXT COLOR PLANET': ['넥스트 컬러 플래닛', 'next color planet'],
  'GHOST': ['고스트', 'ghost'],
  'みちづれ': ['길동무', '미치즈레', 'Michizure'],
  'ソワレ': ['수아레', '소와레', 'Soiree'],
  '灼熱にて純情(wii-wii-woo)': ['작열에서 순정', '샤쿠네츠니테 쥰죠', 'wii-wii-woo', 'Shakunetsu nite Junjou'],
  'Template': ['템플릿', 'template'],
  'ムーンライト': ['문라이트', 'Moonlight'],
  '綺麗事': ['치레말', '키레이고토', 'Kireigoto'],
  'Ahoy!! 我ら宝鐘海賊団☆': ['Ahoy!! 우리들은 호쇼 해적단☆', '아호이 우리들은 호쇼 해적단', '아호이 우리들 호쇼 해적단', '아호이', 'Ahoy!! We Are the Houshou Pirates', 'Ahoy'],
  '美少女無罪♡パイレーツ': ['미소녀 무죄 파이레츠', '미소녀무죄 파이레츠', '비쇼죠 무자이 파이레츠', 'Bishoujo Muzai Pirates'],
  'I’m Your Treasure Box ＊あなたは マリンせんちょうを たからばこからみつけた。': ['아임 유어 트레저 박스', '아임유어트레저박스', '마린 출항', 'I\'m Your Treasure Box'],
  'I\'m Your Treasure Box': ['아임 유어 트레저 박스', '아임유어트레저박스', '마린 출항', '보물 상자', 'treasure box'],
  'パイレーツ': ['파이레츠', 'Pirates'],
  '幽霊船戦': ['유령선전', '유우레이센센', 'Yuurei Sensen'],
  'III': ['쓰리', '아이아이아이', 'iii'],
  '粛聖!! ロリ神レクイエム☆': ['숙성!! 로리신 레퀴엠☆', '숙성 로리신 레퀴엠', '로리신 레퀴엠', '로리신레퀴엠', 'Shukusei!! Loli-Kami Requiem', 'Loli-Kami Requiem'],
  '#あくあ色ぱれっと': ['#아쿠아색 팔레트', '아쿠아색 팔레트', '아쿠아색팔레트', '아쿠아이로 파렛토', 'Aquairo Palette'],
  '海想列車': ['해상열차', '카이소우 렛샤', 'Kaisou Ressha'],
  '瞬間ハートビート': ['순간 하트비트', '순간하트비트', '슌칸 하트비트', '슌칸하트비트', 'Shunkan Heartbeat'],
  'Cheerful Vibes Echo': ['치어풀 바이브스 에코', '치어풀바이브스에코', '치어풀 바이브 에코', '치어풀바이브에코', 'cheerful vibes echo'],
  '失礼しますが、RIP♡': ['실례지만 RIP', '실례합니다만 RIP', 'Excuse My Rudeness, But Could You Please RIP?', 'RIP'],
  'end of a life': ['엔드 오브 어 라이프', 'end of a life'],
  'REFLECT': ['리플렉트', 'reflect'],
  '常夜リペイント': ['상야 리페인트', '토코요 리페인트', 'Tokoyo Repaint'],
  'FACT': ['팩트', 'fact'],
  'ライメイ': ['뇌명', '라이메이', 'Raimei'],
  'サクラカゼ': ['벚꽃바람', '사쿠라카제', 'Sakurakaze'],
  'ぺこらんだむぶれいん!': ['페코랜덤 브레인', 'PekoRandomBrain'],
  'いいわけバニー': ['변명 바니', '이이와케 바니', 'Iiwake Bunny'],
  'Say!ファンファーレ!': ['세이 팡파레', 'Say! Fanfare!'],
  'もぐもぐYUMMY!': ['모구모구 야미', 'Mogu Mogu YUMMY!'],
  '愛包ダンスホール': ['아이파이 댄스홀', '애포 댄스홀', 'Aipai Dancehall'],
  'ヒトガタ': ['히토가타', '인형', 'Hitogata'],

  // --- Song Titles: Idolmaster / Love Live / BanG Dream ---
  'Snow halation': ['스노우 할레이션', '스노하라', 'snow halation'],
  '僕らのLIVE 君とのLIFE': ['우리들의 LIVE 너와의 LIFE', '보쿠라노 라이브 키미토노 라이프'],
  'START:DASH!!': ['스타트 대시', 'start dash'],
  'Wonderful Rush': ['원더풀 러시', 'wonderful rush'],
  '僕らは今のなかで': ['우리들은 지금 속에서', '보쿠라와 이마노 나카데'],
  'きっと青春が聞こえる': ['분명 청춘이 들려올 거야', '킷토 세이슌가 키코에루'],
  'No brand girls': ['노 브랜드 걸즈', 'no brand girls'],
  'ユメノトビラ': ['꿈의 문', '유메노 토비라', 'Yume no Tobira'],
  'どんなときもずっと': ['언제라도 계속', '돈나 토키모 즛토'],
  'SUNNY DAY SONG': ['써니 데이 송', 'sunny day song'],
  '僕たちはひとつの光': ['우리들은 하나의 빛', '보쿠타치와 히토츠노 히카리', 'Bokutachi wa Hitotsu no Hikari'],
  '愛♡スクリ〜ム!': ['아이 스크림', '아이스크림', 'Ai Scream'],
  '青空Jumping Heart': ['푸른 하늘 점핑 하트', '아오조라 점핑 하트', 'Aozora Jumping Heart'],
  '君のこころは輝いてるかい?': ['너의 마음은 빛나고 있니?', '키미노 코코로와 카가야이테루카이'],
  '恋になりたいAQUARIUM': ['사랑이 되고 싶은 아쿠아리움', '코이니 나리타이 아쿠아리움'],
  'HAPPY PARTY TRAIN': ['해피 파티 트레인', 'happy party train'],
  'Thank you, FRIENDS!!': ['땡큐 프렌즈', 'thank you friends'],
  'TOKIMEKI Runners': ['토키메키 러너즈', 'tokimeki runners'],
  'NEO SKY, NEO MAP!': ['네오 스카이 네오 맵', 'neo sky neo map'],
  'START!! True dreams': ['스타트 트루 드림즈', 'start true dreams'],
  'THE IDOLM@STER': ['아이돌마스터', '더 아이돌마스터', 'the idolmaster'],
  'READY!!': ['레디', 'ready'],
  'CHANGE!!!!': ['체인지', 'change'],
  'M@STERPIECE': ['마스터피스', 'masterpiece'],
  'キラメキラリ': ['키라메키라리', 'Kiramekirari'],
  'GO MY WAY!!': ['고 마이 웨이', 'go my way'],
  'relations': ['릴레이션즈', 'relations'],
  '約束': ['약속', '야쿠소쿠', 'Yakusoku'],
  '蒼い鳥': ['파랑새', '아오이 토리', 'Aoi Tori'],
  'お願い！シンデレラ': ['부탁해! 신데렐라', '부탁해 신데렐라', '오네가이 신데렐라', 'Onegai Cinderella'],
  'Star!!': ['스타', 'star'],
  'Shine!!': ['샤인', 'shine'],
  'Tulip': ['튤립', 'tulip'],
  'Trancing Pulse': ['트랜싱 펄스', 'trancing pulse'],
  'Yes! Party Time!!': ['예스 파티 타임', 'yes party time'],
  'Brand new!': ['브랜드 뉴', 'brand new'],
  'Thank You!': ['땡큐', 'thank you'],
  'Welcome!!': ['웰컴', 'welcome'],
  'Brand New Theater!': ['브랜드 뉴 시어터', 'brand new theater'],
  'UNION!!': ['유니온', 'union'],
  'Flyers!!!': ['플라이어즈', 'flyers'],
  'Glow Map': ['글로우 맵', 'glow map'],
  'Harmony 4 You': ['하모니 포 유', 'harmony 4 you'],
  '流星群': ['유성군', '류세이군', 'Ryuuseigun'],
  'ハミングバード': ['허밍버드', 'Hummingbird'],
  '瑠璃色金魚と花菖蒲': ['유리색 금붕어와 꽃창포', '루리이로 킨교토 하나쇼부'],
  'Spread the Wings!!': ['스프레드 더 윙즈', 'spread the wings'],
  'Campus mode!!': ['캠퍼스 모드', 'campus mode'],
  '初': ['하지메', 'Hajime'],
  '世界一可愛い私': ['세계 제일 귀여운 나', '세카이이치 카와이이 와타시'],
  'Luna say maybe': ['루나 세이 메이비', 'luna say maybe'],
  'Fighting My Way': ['파이팅 마이 웨이', 'fighting my way'],
  'ときめきエクスペリエンス！': ['두근거림 익스피리언스', '토키메키 익스피리언스', 'Tokimeki Experience'],
  'キラキラだとか夢だとか 〜Sing Girls〜': ['반짝임이라든가 꿈이라든가', '키라키라다토카 유메다토카'],
  'キズナミュージック♪': ['키즈나 뮤직', '인연 뮤직', 'Kizuna Music'],
  'イニシャル': ['이니셜', 'Initial'],
  'BLACK SHOUT': ['블랙 샤우트', 'black shout'],
  'LOUDER': ['라우더', 'louder'],
  'FIRE BIRD': ['파이어 버드', '불새', 'fire bird'],
  'R': ['알', 'r'],
  'BRAVE JEWEL': ['브레이브 주얼', 'brave jewel'],
  'R·I·O·T': ['라이엇', 'riot'],
  'EXPOSE \'Burn out!!!\'': ['익스포즈 번 아웃', 'expose burn out'],
  '迷星叫': ['미성절규', '마요이보시 우타', '헤매는 별의 외침', 'Mayoiuta'],
  '壱雫空': ['일적공', '히토시즈쿠 소라', '한 방울의 하늘', 'Hitoshizuku'],
  '碧天伴走': ['벽천반주', '헤키텐 반소', 'Hekiten Bansou'],
  '春日影': ['봄날 그림자', '하루히카게', 'Haruhikage'],
  '詩超絆': ['시초반', '우타코토바', 'Utakotoba'],
  'セカイはまだ始まってすらいない': ['세상은 아직 시작조차 하지 않았어', '세카이와 마다 하지맛테 스라 이나이'],
  '群青讃歌': ['군청찬가', '군조 산카', 'Gunjou Sanka'],
  'JOURNEY': ['저니', 'journey'],
  'NEO': ['네오', 'neo'],

  // --- Latest & Popular J-Pop Chart Artists & Bands ---
  'Ayumu Imazu': ['이마즈 아유무', '아유무 이마즈', '이마즈아유무', '아유무이마즈', '今津渉', '아유무', 'ayumu imazu'],
  '今津渉': ['이마즈 아유무', '아유무 이마즈', 'Ayumu Imazu', '아유무'],
  'Kento Nakajima': ['나카지마 켄토', '나카지마 겐토', '나카지마켄토', '中島健人', '켄토', 'kento nakajima'],
  '中島健人': ['나카지마 켄토', '나카지마 겐토', 'Kento Nakajima', '켄토'],
  'Yuki Chiba': ['치바 유키', '지바 유키', '치바유키', '千葉雄喜', '유키', 'yuki chiba'],
  '千葉雄喜': ['치바 유키', '지바 유키', 'Yuki Chiba', '유키'],
  'Mega Shinnosuke': ['메가 신노스케', '메가신노스케', 'メガシンノスケ', '신노스케', 'mega shinnosuke'],
  'hinata miyake': ['미야케 히나타', '미야케히나타', '三宅日向', '히나타', 'hinata miyake'],
  'AiNA THE END': ['아이나 디 엔드', '아이나 지 엔드', '아이나디엔드', '아이나지엔드', 'アイナ・ジ・エンド', '아이나', 'aina the end'],
  'アイナ・ジ・エンド': ['아이나 디 엔드', '아이나 지 엔드', '아이나디엔드', 'AiNA THE END', '아이나'],
  'BiSH': ['비쉬', '비시', 'bish'],
  'jo0ji': ['조지', '죠지', 'joji', 'jo0ji'],
  'AKASAKI': ['아카사키', 'akasaki'],
  'WurtS': ['와츠', '워츠', 'wurts'],
  '紫 今': ['무라사키 이마', '무라사키이마', 'Murasaki Ima', '이마'],
  '紫今': ['무라사키 이마', '무라사키이마', 'Murasaki Ima', '이마'],
  'Murasaki Ima': ['무라사키 이마', '무라사키이마', '紫 今', '이마'],
  'muque': ['무크', '뮤크', 'muque'],
  'harha': ['하루하', '하르하', 'harha'],
  'go!go!vanillas': ['고고바닐라즈', '고 고 바닐라즈', 'go go vanillas'],
  'MONO NO AWARE': ['모노노 아와레', '모노 노 아와레', 'mono no aware'],
  'STARGLOW': ['스타글로우', 'starglow'],
  'ONE OR EIGHT': ['원 오어 에이트', '원오어에이트', 'one or eight'],
  'Brandy Senki': ['브랜디 센키', '브랜디 전기', 'ブランデー戦記', 'brandy senki'],
  'ブランデー戦記': ['브랜디 센키', '브랜디 전기', 'Brandy Senki'],
  'Luby Sparks': ['루비 스파크스', '루비스파크스', 'luby sparks'],
  '君島大空': ['키미시마 오오조라', '키미시마 오조라', '기미시마 오오조라', 'Kimishima Ohzora', '오오조라', '오조라'],
  'PSYCHIC FEVER from EXILE TRIBE': ['사이킥 피버', '사이킥피버', 'PSYCHIC FEVER', 'psychic fever'],
  'PSYCHIC FEVER': ['사이킥 피버', '사이킥피버', 'psychic fever'],
  'EXILE': ['에그자일', '엑자일', 'exile'],
  'EXILE TRIBE': ['에그자일 트라이브', '에그자일', 'exile tribe'],
  '三代目 J SOUL BROTHERS': ['산다이메 제이 소울 브라더스', '산다이메', '제이소울브라더스'],
  'Billyrrom': ['빌리롬', 'billyrrom'],
  'SIRUP': ['시럽', 'sirup'],
  'HANA': ['하나', 'hana'],
  'MEIYO DENSETSU': ['메이요 덴세츠', '명예전설', '名誉伝説', 'meiyo densetsu'],
  '名誉伝説': ['메이요 덴세츠', '명예전설', 'MEIYO DENSETSU'],
  'm-flo': ['엠플로', '엠 플로', 'm-flo', 'mflo'],
  'Diggy-MO\'': ['디기모', '디기 모', 'diggy mo'],
  'しのだりょうすけ': ['시노다 료스케', '시노다료스케', 'Shinoda Ryosuke', '료스케'],
  'RETRORIRON': ['레트로리론', 'レトロリロン', 'retroriron'],
  'レトロリロン': ['레트로리론', 'RETRORIRON'],
  'Haku.': ['하쿠', 'ハク。', 'haku'],
  'ハク。': ['하쿠', 'Haku.', 'haku'],
  'Otoboke Beaver': ['오토보케 비버', '오토보케비버', 'おとぼけビ〜バ〜', 'otoboke beaver'],
  'おとぼけビ〜バ〜': ['오토보케 비버', 'Otoboke Beaver'],
  'NOMELON NOLEMON': ['노멜론 노레몬', '노멜론노레몬', 'ノーメロンノーレモン', 'nomelon nolemon'],
  'Homecomings': ['홈커밍즈', '홈커밍스', 'homecomings'],
  'LUCKY TAPES': ['럭키 테이프스', '럭키테이프스', 'lucky tapes'],
  'KUROMI': ['쿠로미', 'クロミ', 'kuromi'],
  'クロミ': ['쿠로미', 'KUROMI'],
  'Rol3ert': ['로버트', '롤버트', 'robert', 'rol3ert'],
  'REJAY': ['리제이', 'rejay'],
  'Jeremy Quartus': ['제레미 쿼터스', 'jeremy quartus'],
  '井上苑子': ['이노우에 소노코', '이노우에소노코', 'Inoue Sonoko', 'Sonoko Inoue', '소노코'],
  '上白石萌音': ['카미시라이시 모네', '가미시라이시 모네', 'Kamishiraishi Mone', '모네'],
  '上白石萌歌': ['카미시라이시 모카', '가미시라이시 모카', 'Kamishiraishi Moka', 'adieu', '모카'],
  'adieu': ['아듀', '카미시라이시 모카', 'adieu'],
  '手嶌葵': ['테시마 아오이', '데시마 아오이', 'Aoi Teshima', '아오이'],
  '高橋洋子': ['타카하시 요코', '다카하시 요코', 'Yoko Takahashi', '요코'],
  '和田光司': ['와다 코지', '와다 고지', 'Koji Wada', '코지'],
  '槇原敬之': ['마키하라 노리유키', 'Noriyuki Makihara', '노리유키'],
  '広瀬香美': ['히로세 코미', '히로세 고미', 'Komi Hirose', '코미'],
  '鈴木愛理': ['스즈키 아이리', 'Airi Suzuki', '아이리'],
  '鈴木このみ': ['스즈키 코노미', 'Konomi Suzuki', '코노미'],
  '大橋トリオ': ['오오하시 트리오', '오하시 트리오', 'Ohashi Trio'],
  'くるり': ['쿠루리', '구루리', 'Quruli'],
  'アジカン': ['아지캉', '아지칸', 'ASIAN KUNG-FU GENERATION'],
  'チャットモンチー': ['챗몬치', 'Chatmonchy'],
  '赤い公園': ['아카이 코엔', '붉은 공원', 'Akai Ko-en'],
  'きのこ帝国': ['키노코 제국', '키노코 테이코쿠', '버섯제국', 'Kinoko Teikoku'],
  '佐藤千亜妃': ['사토 치아키', 'Chiaki Sato', '치아키'],
  'カネコアヤノ': ['카네코 아야노', '가네코 아야노', 'Kaneko Ayano', '아야노'],
  '折坂悠太': ['오리사카 유타', 'Yuta Orisaka', '유타'],
  '中村佳穂': ['나카무라 카호', 'Kaho Nakamura', '카호'],
  '離婚伝説': ['이혼전설', '리콘 덴세츠', 'Rikon Densetsu'],
  'サバシスター': ['사바 시스터', 'Saba Sister'],
  '超学生': ['초학생', '쵸가쿠세이', 'Chogakusei'],
  '音田雅則': ['오토다 마사노리', 'Masanori Otoda', '마사노리'],
  '舟津真翔': ['후나츠 마나토', 'Manato Funatsu', '마나토'],
  'シャイトープ': ['샤이토프', 'shytaupe'],
  'shytaupe': ['샤이토프', 'シャイトープ'],
  'Tele': ['텔레', 'tele'],
  '水曜日のカンパネラ': ['수요일의 캄파넬라', '수요일의캄파넬라', '스이요비노 캄파넬라', 'WEDNESDAY CAMPANELLA', 'Wednesday Campanella'],
  'WEDNESDAY CAMPANELLA': ['수요일의 캄파넬라', '수요일의캄파넬라', '스이요비노 캄파넬라', '웬즈데이 캄파넬라', '水曜日のカンパネラ', 'wednesday campanella'],
  '구래': ['쿠레'],

  // --- Latest & Popular J-Pop Chart Songs ---
  'Destiny Journeys': ['데스티니 저니즈', '데스티니 저니', 'destiny journeys'],
  'キライのちスキ！': ['키라이노치 스키', '키라이노치스키', '싫어함 뒤 좋아함', '미움 뒤 좋아함', '싫음 뒤 좋음', 'Kirai nochi Suki'],
  'キライのちスキ': ['키라이노치 스키', '키라이노치스키', '싫어함 뒤 좋아함', '미움 뒤 좋아함', '싫음 뒤 좋음', 'Kirai nochi Suki'],
  '夜鷹 - Yodaka': ['요다카', '쏙독새', '밤매', 'Yodaka', '夜鷹'],
  '夜鷹': ['요다카', '쏙독새', '밤매', 'Yodaka'],
  'Yodaka': ['요다카', '쏙독새', '밤매', '夜鷹'],
  'Brand New': ['브랜드 뉴', '브랜드뉴', 'brand new'],
  'DND': ['디엔디', 'dnd'],
  'さよならは言わない': ['사요나라와 이와나이', '안녕은 말하지 않아', '이별은 말하지 않아', '작별은 말하지 않아', 'Sayonara wa Iwanai'],
  'あかねさす頃': ['아카네사스 코로', '아카네사스 고로', '노을빛 비치는 무렵', '노을 질 무렵', 'Akanesasu Koro'],
  'あかねさす': ['아카네사스', 'Akanesasu'],
  'ソフィリア': ['소필리아', '소피리아', 'Sophilia'],
  'かげろう': ['카게로우', '카게로', '아지랑이', '하루살이', 'Kagerou'],
  '陽炎': ['카게로우', '카게로', '아지랑이', 'Kagerou'],
  'swim?': ['스윔', '수영', 'swim'],
  'DIGITAL GIRL': ['디지털 걸', '디지털걸', 'digital girl'],
  'グッタイム': ['굿타임', '굿 타임', '긋타이무', 'Good Time'],
  'オリオン': ['오리온', 'Orion', 'orion'],
  'halfway': ['하프웨이', 'halfway'],
  '結び': ['무스비', '매듭', 'Musubi'],
  'Feel like slowing down': ['필 라이크 슬로잉 다운', 'feel like slowing down'],
  'YOROSHIKU!!!': ['요로시쿠', '잘 부탁해', 'Yoroshiku'],
  'YOROSHIKU': ['요로시쿠', '잘 부탁해', 'Yoroshiku'],
  '気分': ['키분', '기분', 'Kibun'],
  'Running Wheel': ['러닝 휠', '런닝 휠', 'running wheel'],
  'bed': ['베드', '침대', 'bed'],
  'WHATCHA DOIN': ['왓챠 두인', '왓차 두인', 'whatcha doin'],
  'pupa': ['퓨파', '푸파', '번데기', 'pupa'],
  'With you': ['위드 유', '위드유', 'with you'],
  'Yuzutsu': ['유즈츠', '유우즈츠', '개밥바라기', '초저녁 별', '宵待星'],
  '烏 - Raven': ['카라스', '까마귀', '레이븐', 'Karasu', 'Raven', '烏'],
  '烏': ['카라스', '까마귀', 'Karasu', 'Raven'],
  'Raven': ['레이븐', '까마귀', '카라스', 'raven'],
  'ブルーチーズ': ['블루치즈', '블루 치즈', '부루치즈', 'Blue Cheese'],
  'AIYOU': ['아이유', '아이요우', 'aiyou'],
  'スカート': ['스커트', '스카토', '스카트', 'Skirt'],
  'HOME': ['홈', '집', 'home'],
  'BUGS LIFE': ['벅스 라이프', '버그스 라이프', 'bugs life'],
  'Gekijoban de Aimasyo': ['게키조반데 아이마쇼', '게키죠반데 아이마쇼', '극장판에서 만나요', '극장판에서 만납시다'],
  '劇場版で会いましょう': ['게키조반데 아이마쇼', '극장판에서 만나요'],
  'Puppet': ['퍼핏', '퍼펫', '꼭두각시', 'puppet'],
  'ポップス': ['팝스', '폿푸스', 'Pops'],
  'TRICK STAR': ['트릭 스타', '트릭스타', 'trick star'],
  'ハイライト': ['하이라이트', '하이라이토', 'Highlight'],
  'WISHES': ['위시즈', '위시스', '소원', 'wishes'],
  'Sugar Rush': ['슈가 러시', '슈가 러쉬', '슈가러시', 'sugar rush'],
  '風になれるはず': ['카제니 나레루 하즈', '바람이 될 수 있을 거야', '바람이 될 수 있을 터', 'Kaze ni Nareru Hazu'],
  'YANKEE SQUAT': ['양키 스쿼트', 'yankee squat'],
  'ブラッド♡スパークス': ['블러드 스파크스', '블러드스파크스', '부랏도 스파쿠스', 'Blood Sparks'],
  'I disappear': ['아이 디서피어', 'i disappear'],
  'Flame': ['플레임', '불꽃', 'flame'],
  '琥珀の遠景': ['코하쿠노 엔케이', '호박의 원경', 'Kohaku no Enkei'],
  '鬼事': ['오니곳코', '오니고토', '술래잡기', 'Onigokko'],
  'Sweet Memories': ['스위트 메모리즈', '스윗 메모리즈', 'sweet memories'],
  'kimagure': ['키마구레', '변덕', 'Kimagure'],
  '気まぐれ': ['키마구레', '변덕', 'Kimagure'],
  '美人局': ['츠츠모타세', '미인국', '꽃뱀', 'Tsutsumotase'],
  'I Got Ways': ['아이 갓 웨이즈', 'i got ways'],
  'Pink Lemonade': ['핑크 레모네이드', '핑크레모네이드', 'pink lemonade'],
  'No Epilogue': ['노 에필로그', 'no epilogue'],
  'パッパパラダイス': ['팟파파라다이스', '파파파라다이스', 'Pappa Paradise'],
  'YES': ['예스', 'yes'],
  'ポルターガイスト': ['폴터가이스트', '포루타가이스토', 'Poltergeist'],
  'Rondo': ['론도', '윤무곡', 'rondo'],
  'Boogie': ['부기', 'boogie'],
  'うるさ': ['우루사', '시끄러워', 'Urusa'],
  '千鳥': ['치도리', '물떼새', '천조', 'Chidori'],
  'Hallelujah': ['할렐루야', 'hallelujah'],
  '催し': ['모요오시', '행사', '모임', '징조', 'Moyooshi'],
  'Not AI': ['낫 에이아이', 'not ai'],
  'Chanka Chanka': ['찬카 찬카', '챤카 챤카', 'chanka chanka'],
  'ROMANTICIZE': ['로맨티사이즈', 'romanticize'],
  'CLASSIC': ['클래식', 'classic'],
  'まーいいや': ['마 이이야', '마이이야', '뭐 어때', '됐어', 'Maa Iiya'],
  'Missing': ['미싱', '그리움', '행방불명', 'missing'],
  'イデアが溢れて眠れない': ['이데아가 아후레테 네무레나이', '이데아가 넘쳐서 잠들 수 없어', '이데아가 넘쳐 잠들지 못해', 'Idea ga Afurete Nemurenai'],
  'Fright': ['프라이트', '공포', 'fright'],
  'ultra soul': ['울트라 소울', '울트라소울', 'ultra soul'],
  'シンギュラリティ': ['싱귤래리티', '싱귤러리티', '신규라리티', 'Singularity'],
  '風に乗る': ['카제니 노루', '바람을 타다', '바람에 타다', 'Kaze ni Noru'],
  'It\'s Alright': ['이츠 올라이트', '잇츠 올라이트', '괜찮아', 'its alright'],
  'Bloom': ['블룸', '개화', '꽃피다', 'bloom'],
  '蛹': ['사나기', '번데기', 'Sanagi'],
  'ルミナス - Luminous': ['루미너스', 'Luminous', 'ルミナス'],
  'Luminous': ['루미너스', 'luminous'],
  'lulu.': ['루루', '룰루', 'lulu'],
  '愛晩餐': ['아이반산', '사랑 만찬', '사랑만찬', '애만찬', 'Ai Bansan'],
  'ギューアグ': ['규아구', 'Gyuagu'],
  'GateWay': ['게이트웨이', '게이트 웨이', 'gateway'],
  'Bad Girl': ['배드 걸', '배드걸', 'bad girl'],
  'Dogs': ['도그즈', '독스', '개들', 'dogs'],
  'Liar': ['라이어', '거짓말쟁이', 'liar'],
  'アイ・アイ・ア': ['아이 아이 아', '아이아이아', 'Ai Ai A'],
  'エゴ': ['에고', '자아', 'Ego'],
  'Let you go': ['렛 유 고', '렛유고', 'let you go'],
  'ふわ輪': ['후와와', '후와린', 'Fuwawa'],
  'Hanamushiro': ['하나무시로', '꽃자리', '꽃방석', '花筵'],
  '0.2mm': ['0.2밀리미터', '0.2mm', '영점이밀리'],
  'Vivarium': ['비바리움', 'vivarium'],
  'IRANAI': ['이라나이', '필요 없어', '필요없어', 'いらない', 'iranai'],
  'いらない': ['이라나이', '필요 없어', '필요없어', 'IRANAI'],
  'I Don\'t Need To Be In Your Strike Zone': ['아이 돈 니드 투 비 인 유어 스트라이크 존', 'strike zone'],
  'KILLERMOON': ['킬러문', '킬러 문', 'killermoon'],
  '零-zero-': ['제로', '레이', '영', 'zero', '零'],
  'リコンティニュー': ['리컨티뉴', '리콘티뉴', 'Recontinue'],
  'いとおしい日々': ['이토오시이 히비', '이토시이 히비', '사랑스러운 나날', '애틋한 나날', 'Itooshii Hibi'],
  '灯を護る': ['히오 마모루', '아카리오 마모루', '토모시비오 마모루', '등불을 지키다', '불빛을 지키다', 'Hi wo Mamoru'],

  // --- Classic & Modern J-Pop / Anime / City Pop Essential Songs ---
  '晩餐歌': ['만찬가', '반산카', 'Bansanka', 'bansanka'],
  'Bling-Bang-Bang-Born': ['블링뱅뱅본', '블링 뱅 뱅 본', 'bling bang bang born'],
  '二度寝': ['니도네', '두 번 잠들기', '늦잠', 'Nidone'],
  'かつて天才だった俺たちへ': ['일찍이 천재였던 우리들에게', '카츠테 텐사이닷타 오레타치에'],
  'のびしろ': ['노비시로', '발전 가능성', 'Nobishiro'],
  '花になって': ['꽃이 되어줘', '꽃이 되어', '하나니 낫테', 'Hana ni Natte', 'Be a flower'],
  'Mela!': ['멜라', '멜라!', 'mela'],
  'キャラクター': ['캐릭터', 'Character'],
  'サマータイムシンデレラ': ['서머타임 신데렐라', 'Summertime Cinderella'],
  'Shout Baby': ['샤우트 베이비', 'shout baby'],
  '陽のあたる坂道': ['햇살 비치는 언덕길', '히노 아타루 사카미치'],
  '青のすみか': ['푸름이 사는 곳', '청의 거처', '아오노 스미카', 'Ao no Sumika', 'Where Our Blue Is'],
  'スカーレット': ['스칼렛', 'Scarlet'],
  '悪마のキッス': ['악마의 키스', '아쿠마노 키스'],
  'ファタール': ['파탈', 'Fatal', 'fatal'],
  'NIGHT DANCER': ['나이트 댄서', '나이트댄서', 'night dancer'],
  'Nagisa': ['나기사', '물가', '해변', 'nagisa'],
  '체리': ['チェリー', 'Cherry'],
  'チェリー': ['체리', 'Cherry', 'cherry'],
  'ロビンソン': ['로빈슨', 'Robinson', 'robinson'],
  '空も飛べるはず': ['하늘도 날 수 있을 거야', '소라모 토베루 하즈', 'Sora mo Toberu Hazu'],
  '楓': ['카에데', '단풍', 'Kaede'],
  '美しい鰭': ['아름다운 지느러미', '우츠쿠시이 히레', 'Utsukushii Hire'],
  '優しいあの子': ['다정한 그 아이', '야사시이 아노 코', 'Yasashii Ano Ko'],
  '涙がキラリ☆': ['눈물이 반짝', '나미다가 키라리', 'Namida ga Kirari'],
  '新宝島': ['신보물섬', '신타카라지마', 'Shin Takarajima'],
  '怪獣': ['괴수', '카이쥬', '카이주', 'Kaiju'],
  '忘れられないの': ['잊을 수 없는걸', '와스레라레나이노', 'Wasurerarenaino'],
  'アイデンティティ': ['아이덴티티', 'Identity'],
  '夜の踊り子': ['밤의 무희', '요루노 오도리코', 'Yoru no Odoriko'],
  'ミュージック': ['뮤직', 'Music'],
  '小さな恋のうた': ['작은 사랑의 노래', '치이사나 코이노 우타', 'Chiisana Koi no Uta'],
  'あなたに': ['당신에게', '아나타니', 'Anata ni'],
  'キセキ': ['기적', '키세키', 'Kiseki'],
  '愛唄': ['사랑노래', '아이우타', 'Ai Uta'],
  '遥か': ['하루카', '아득히', 'Haruka'],
  '오렌지': ['オレンジ', 'Orange'],
  '粉雪': ['싸락눈', '코나유키', 'Konayuki'],
  '3月9日': ['3월 9일', '산가츠 코코노카', 'Sangatsu Kokonoka'],
  '天体観測': ['천체관측', '텐타이칸소쿠', 'Tentai Kansoku'],
  'カルマ': ['카르마', '업보', 'Karma'],
  'ray': ['레이', 'ray'],
  'K': ['케이', 'k'],
  '車輪の唄': ['수레바퀴의 노래', '샤린노 우타', 'Sharin no Uta'],
  'SOUVENIR': ['수베니어', '기념품', 'souvenir'],
  'Acacia': ['아카시아', 'acacia'],
  'アカシア': ['아카시아', 'Acacia'],
  'Hello,world!': ['헬로 월드', 'hello world'],
  '표리일체': ['表裏一体'],
  '表裏一体': ['표리일체', '효리잇타이', 'Hyouri Ittai'],
  'ゆずれない願い': ['양보할 수 없는 소원', '유즈레나이 네가이'],
  '夏色': ['여름빛', '나츠이로', 'Natsuiro'],
  '栄光の架橋': ['영광의 가교', '에이코노 카케하시', 'Eikou no Kakehashi'],
  '奏(かなで)': ['카나데', '연주', 'Kanade'],
  '奏（かなで）': ['카나데', '연주', 'Kanade'],
  '奏': ['카나데', '연주', 'Kanade'],
  '全力少年': ['전력소년', '젠료쿠 쇼넨', 'Zenryoku Shounen'],
  'さくら': ['사쿠라', '벚꽃', 'Sakura'],
  '桜': ['사쿠라', '벚꽃', 'Sakura'],
  'SAKURA': ['사쿠라', '벚꽃', 'sakura'],
  '桜坂': ['사쿠라자카', '벚꽃언덕', 'Sakurazaka'],
  'ありがとう': ['고마워', '아리가토', 'Arigatou'],
  '気まぐれロマンティック': ['변덕스러운 로맨틱', '키마구레 로맨틱', 'Kimagure Romantic'],
  'YELL': ['옐', 'yell'],
  'じょいふる': ['조이풀', 'Joyful'],
  '風が吹いている': ['바람이 불고 있어', '카제가 후이테 이루'],
  '蕾': ['꽃봉오리', '츠보미', 'Tsubomi'],
  '赤い糸': ['붉은 실', '아카이 이토', 'Akai Ito'],
  '流星': ['유성', '류세이', 'Ryuusei'],
  '三日月': ['초승달', '미카즈키', 'Mikazuki'],
  'にじいろ': ['무지개색', '니지이로', 'Nijiiro'],
  'おかえり': ['어서 와', '오카에리', 'Okaeri'],
  'やさしいキスをして': ['다정한 키스를 해줘', '야사시이 키스오 시테'],
  '未来予想図II': ['미래예상도2', '미라이 요소즈'],
  'LOVE LOVE LOVE': ['러브 러브 러브', 'love love love'],
  '雪の華': ['눈의 꽃', '유키노 하나', 'Yuki no Hana'],
  'GLAMOROUS SKY': ['글래머러스 스카이', 'glamorous sky'],
  'ORION': ['오리온', 'orion'],
  '僕が死のうと思ったのは': ['내가 죽으려고 생각한 것은', '보쿠가 시노우토 오못타노와'],
  '瞳をとじて': ['눈을 감고', '히토미오 토지테', 'Hitomi wo Tojite'],
  '大きな古時計': ['할아버지의 낡은 시계', '오오키나 후루도케이'],
  'POP STAR': ['팝 스타', '팝스타', 'pop star'],
  '해바라기의 약속': ['ひまわりの約束'],
  'ひまわりの約束': ['해바라기의 약속', '히마와리노 야쿠소쿠', 'Himawari no Yakusoku'],
  '鱗': ['비늘', '우로코', 'Uroko'],
  'Rain': ['레인', '비', 'rain'],
  '言ノ葉': ['언어의 잎', '코토노하', 'Kotonoha'],
  '배드 애플': ['Bad Apple!!'],
  'Bad Apple!!': ['배드 애플', 'bad apple'],
  '플라스틱 러브': ['プラスティック・ラブ', 'Plastic Love'],
  'プラスティック・ラブ': ['플라스틱 러브', '플라스틱러브', 'Plastic Love'],
  'プラスティック・ラヴ': ['플라스틱 러브', '플라스틱러브', 'Plastic Love'],
  'Plastic Love': ['플라스틱 러브', '플라스틱러브', 'plastic love'],
  '真夜中のドア〜stay with me': ['한밤중의 도어', '마요나카노 도아', '스테이 위드 미', 'Stay With Me'],
  '真夜中のドア': ['한밤중의 도어', '마요나카노 도아', 'Stay With Me'],
  'Stay With Me': ['스테이 위드 미', 'stay with me'],
  'RIDE ON TIME': ['라이드 온 타임', 'ride on time'],
  'クリスマスイブ': ['크리스마스 이브', 'Christmas Eve'],
  'フライディ・チャイナタウン': ['프라이데이 차이나타운', '플라이데이 차이나타운', 'Fly-day Chinatown'],
  '悲しみがとまらない': ['슬픔이 멈추지 않아', '카나시미가 토마라나이', 'I Can\'t Stop the Loneliness'],
  'Remember Summer Days': ['리멤버 서머 데이즈', 'remember summer days'],
  'テレフォン・ナンバー': ['텔레폰 넘버', 'Telephone Number'],
  '4:00A.M.': ['4시', '4am', '4:00am'],
  'ルビーの指環': ['루비 반지', '루비노 유비와'],
  '青い珊瑚礁': ['푸른 산호초', '아오이 산고쇼', 'Aoi Sangoshou'],
  '赤いスイートピー': ['붉은 스위트피', '아카이 스위트피'],
  '少女A': ['소녀A', '쇼죠 A', 'Shoujo A'],
  'DESIRE -情熱-': ['디자이어', '정열', 'Desire'],
  'I LOVE YOU': ['아이 러브 유', '아이러브유', 'i love you'],
  '15の夜': ['15세의 밤', '쥬고노 요루'],
  'OH MY LITTLE GIRL': ['오 마이 리틀 걸', 'oh my little girl'],
  '糸': ['실', '이토', 'Ito'],
  '時代': ['시대', '지다이', 'Jidai'],
  '空と君のあいだに': ['하늘과 너의 사이에', '소라토 키미노 아이다니'],
  '銀の龍の背に乗って': ['은빛 용의 등에 타고', '긴노 류노 세니 놋테'],
  '春よ、来い': ['봄이여 오라', '하루요 코이', 'Haru yo Koi'],
  'やさしさに包まれたなら': ['다정함에 감싸인다면', '야사시사니 츠츠마레타나라'],
  'ルージュの伝言': ['루주 전언', '루즈의 전언', 'Rouge no Dengon'],
  'ひこうき雲': ['비행운', '히코키구모', 'Hikoukigumo'],
  '真夏の果実': ['한여름의 과실', '마나츠노 카지츠', 'Manatsu no Kajitsu'],
  'TSUNAMI': ['쓰나미', '츠나미', 'tsunami'],
  '涙そうそう': ['눈물이 주룩주룩', '나다소우소우', 'Nadasousou'],
  'ハナミズキ': ['산딸나무', '하나미즈키', 'Hanamizuki'],
  'もらい泣き': ['덩달아 울기', '모라이나키', 'Morainaki'],
  'さくらんぼ': ['사쿠란보', '버찌', '체리', 'Sakuranbo'],
  '플라네타리움': ['プラネタリウム', 'Planetarium'],
  'プラネタリウム': ['플라네타리움', 'Planetarium', 'planetarium'],
  '金魚花火': ['금붕어 불꽃', '킨교하나비', 'Kingyo Hanabi'],
  'SMILY': ['스마일리', 'smily'],
  'PEACH': ['피치', '복숭아', 'peach'],
  '창성': ['創聖のアクエリオン'],
  '創聖のアクエリオン': ['창성의 아쿠에리온', '소세이노 아쿠에리온', 'Genesis of Aquarion'],
  '남자의 훈장': ['男の勲章'],
  '第ゼロ感': ['제0감', '제제로감', '다이제로칸', 'Dai Zero Kan'],
  '燈': ['등불', '아카리', 'Akari'],
  'more than words': ['모어 댄 워즈', 'more than words'],
  'SPECIALZ': ['스페셜즈', '스페셜', 'specialz'],
  'IRIS OUT': ['아이리스 아웃', 'iris out'],
  'JANE DOE': ['제인 도', 'jane doe'],
  '호시아이': ['ホシアイ'],
  'ホシアイ': ['호시아이', '성간', 'Hoshiai'],
};

/**
 * Expands a Korean transliteration of a Japanese name/word into common Korean phonetic variants
 * (외래어 표기법 vs 통용 표기: 오오↔오, 유우↔유, 츠↔쓰, 어두 타↔다/카↔가, 시마↔지마, 켄↔겐, 죠↔조, 쥬↔주 등)
 */
export function expandJapaneseKoreanVariants(korStr) {
  if (!korStr || typeof korStr !== 'string' || !/[가-힣]/.test(korStr)) return [];
  const variants = new Set([korStr.trim()]);

  const applyRule = (fn) => {
    const current = [...variants];
    for (const v of current) {
      const next = fn(v);
      if (Array.isArray(next)) {
        for (const n of next) {
          if (n && n.length >= 2) variants.add(n);
        }
      } else if (next && next.length >= 2) {
        variants.add(next);
      }
    }
  };

  // 1. Long vowels & geminate vowels
  applyRule(s => [
    s.replace(/오오/g, '오'),
    s.replace(/유우/g, '유'),
    s.replace(/우우/g, '우'),
    s.replace(/오우/g, '오'),
    s.replace(/시이나/g, '시나'),
    s.replace(/마아야/g, '마야'),
    s.replace(/타이이쿠/g, '타이쿠'),
  ]);

  // 2. 츠 ↔ 쓰, 즈 ↔ 츠
  applyRule(s => [
    s.replace(/츠/g, '쓰'),
    s.replace(/쓰/g, '츠'),
    s.replace(/요네즈/g, '요네츠'),
  ]);

  // 3. 쥬 ↔ 주, 죠 ↔ 조, 쟈 ↔ 자, 쵸 ↔ 초, 츄 ↔ 추
  applyRule(s => [
    s.replace(/쥬/g, '주').replace(/죠/g, '조').replace(/쟈/g, '자').replace(/쵸/g, '초').replace(/츄/g, '추'),
    s.replace(/주/g, '쥬').replace(/조/g, '죠'),
  ]);

  // 4. 시마 ↔ 지마, 사키 ↔ 자키, 자키 ↔ 사키
  applyRule(s => [
    s.replace(/시마/g, '지마'),
    s.replace(/지마/g, '시마'),
    s.replace(/사키/g, '자키'),
    s.replace(/자키/g, '사키'),
  ]);

  // 5. Word-initial (start of string or after space) aspirated <-> plain (외래어 표기법 어두 예사소리)
  const initialPairs = [
    ['타', '다'], ['다', '타'],
    ['카', '가'], ['가', '카'],
    ['코', '고'], ['고', '코'],
    ['쿠', '구'], ['구', '쿠'],
    ['키', '기'], ['기', '키'],
    ['케', '게'], ['게', '케'],
    ['토', '도'], ['도', '토'],
    ['테', '데'], ['데', '테'],
    ['츠', '쓰'], ['쓰', '츠'],
    ['켄', '겐'], ['겐', '켄'],
    ['칸', '간'], ['간', '칸'],
    ['쿄', '교'], ['교', '쿄'],
  ];
  applyRule(s => {
    const words = s.split(/\s+/);
    let wordCombos = [''];
    for (const w of words) {
      const wSet = new Set([w]);
      for (const [from, to] of initialPairs) {
        if (w.startsWith(from)) {
          wSet.add(to + w.slice(from.length));
        }
      }
      const nextCombos = [];
      for (const prefix of wordCombos) {
        for (const wv of wSet) {
          nextCombos.push(prefix ? `${prefix} ${wv}` : wv);
        }
      }
      wordCombos = nextCombos.slice(0, 16);
    }
    return wordCombos;
  });

  // Also add space-stripped versions
  const snapshot = [...variants];
  for (const v of snapshot) {
    if (v.includes(' ')) {
      variants.add(v.replace(/\s+/g, ''));
    }
  }

  return [...variants];
}

export const JAPANESE_PERSON_ARTISTS = [
  // J-Pop / Anime
  {
    kanji: ['音乃瀬', '奏'],
    korean: ['오토노세', '카나데'],
    romaji: ['Otonose', 'Kanade'],
    extraGiven: ['kanade'],
    extraSur: ['otonose'],
  },
  {
    kanji: ['米津', '玄師'],
    korean: ['요네즈', '켄시'],
    romaji: ['Yonezu', 'Kenshi'],
    extraGiven: ['kenshi'],
    extraSur: ['yonezu'],
  },
  {
    kanji: ['星野', '源'],
    korean: ['호시노', '겐'],
    romaji: ['Hoshino', 'Gen'],
    extraGiven: ['gen'],
    extraSur: ['hoshino'],
  },
  {
    kanji: ['宇多田', 'ヒカル'],
    korean: ['우타다', '히카루'],
    romaji: ['Utada', 'Hikaru'],
    extraGiven: ['hikaru'],
    extraSur: ['utada'],
  },
  {
    kanji: ['藤井', '風'],
    korean: ['후지이', '카제'],
    romaji: ['Fujii', 'Kaze'],
    extraGiven: ['kaze'],
    extraSur: ['fujii'],
  },
  {
    kanji: ['幾田', 'りら'],
    korean: ['이쿠타', '리라'],
    romaji: ['Ikuta', 'Lilas'],
    extraGiven: ['lilas', 'rira'],
    extraSur: ['ikuta'],
  },
  {
    kanji: ['夏川', '椎菜'],
    korean: ['나츠카와', '시이나'],
    romaji: ['Natsukawa', 'Shiina'],
    extraGiven: ['shiina'],
    extraSur: ['natsukawa'],
  },
  {
    kanji: ['望月', '杏奈'],
    korean: ['모치즈키', '안나'],
    romaji: ['Mochizuki', 'Anna'],
    extraGiven: ['anna'],
    extraSur: ['mochizuki'],
  },
  {
    kanji: ['椎名', '林檎'],
    korean: ['시이나', '링고'],
    romaji: ['Sheena', 'Ringo'],
    extraGiven: ['ringo'],
    extraSur: ['sheena', 'shiina'],
  },
  {
    kanji: ['菅田', '将暉'],
    korean: ['스다', '마사키'],
    romaji: ['Suda', 'Masaki'],
    extraGiven: ['masaki'],
    extraSur: ['suda'],
  },
  {
    kanji: ['キタニ', 'タツヤ'],
    korean: ['키타니', '타츠야'],
    romaji: ['Kitani', 'Tatsuya'],
    extraGiven: ['tatsuya'],
    extraSur: ['kitani'],
  },
  {
    kanji: ['初音', 'ミク'],
    korean: ['하츠네', '미쿠'],
    romaji: ['Hatsune', 'Miku'],
    extraGiven: ['miku'],
    extraSur: ['hatsune'],
  },
  // Hololive / VTuber
  {
    kanji: ['星街', 'すいせい'],
    korean: ['호시마치', '스이세이'],
    romaji: ['Hoshimachi', 'Suisei'],
    extraGiven: ['suisei'],
    extraSur: ['hoshimachi'],
  },
  {
    kanji: ['宝鐘', 'マリン'],
    korean: ['호쇼', '마린'],
    romaji: ['Houshou', 'Marine'],
    extraGiven: ['marine'],
    extraSur: ['houshou', 'hosho'],
  },
  {
    kanji: ['湊', 'あくあ'],
    korean: ['미나토', '아쿠아'],
    romaji: ['Minato', 'Aqua'],
    extraGiven: ['aqua'],
    extraSur: ['minato'],
  },
  {
    kanji: ['森', 'カリオペ'],
    korean: ['모리', '칼리오페'],
    romaji: ['Mori', 'Calliope'],
    extraGiven: ['calliope'],
    extraSur: ['mori'],
  },
  {
    kanji: ['猫又', 'おかゆ'],
    korean: ['네코마타', '오카유'],
    romaji: ['Nekomata', 'Okayu'],
    extraGiven: ['okayu'],
    extraSur: ['nekomata'],
  },
  {
    kanji: ['戌神', 'ころね'],
    korean: ['이누가미', '코로네'],
    romaji: ['Inugami', 'Korone'],
    extraGiven: ['korone'],
    extraSur: ['inugami'],
  },
  {
    kanji: ['白上', 'フブキ'],
    korean: ['시라카미', '후부키'],
    romaji: ['Shirakami', 'Fubuki'],
    extraGiven: ['fubuki'],
    extraSur: ['shirakami'],
  },
  {
    kanji: ['兎田', 'ぺこら'],
    korean: ['우사다', '페코라'],
    romaji: ['Usada', 'Pekora'],
    extraGiven: ['pekora'],
    extraSur: ['usada'],
  },
  {
    kanji: ['さくら', 'みこ'],
    korean: ['사쿠라', '미코'],
    romaji: ['Sakura', 'Miko'],
    extraGiven: ['miko'],
    extraSur: ['sakura'],
  },
  {
    kanji: ['角巻', 'わため'],
    korean: ['츠노마키', '와타메'],
    romaji: ['Tsunomaki', 'Watame'],
    extraGiven: ['watame'],
    extraSur: ['tsunomaki'],
  },
  {
    kanji: ['常闇', 'トワ'],
    korean: ['토코야미', '토와'],
    romaji: ['Tokoyami', 'Towa'],
    extraGiven: ['towa'],
    extraSur: ['tokoyami'],
  },
  {
    kanji: ['天音', 'かなた'],
    korean: ['아마네', '카나타'],
    romaji: ['Amane', 'Kanata'],
    extraGiven: ['kanata'],
    extraSur: ['amane'],
  },
  // Bocchi the Rock
  {
    kanji: ['後藤', 'ひとり'],
    korean: ['고토', '히토리'],
    romaji: ['Goto', 'Hitori'],
    extraGiven: ['hitori'],
    extraSur: ['goto'],
  },
  {
    kanji: ['伊地知', '虹夏'],
    korean: ['이지치', '니지카'],
    romaji: ['Ijichi', 'Nijika'],
    extraGiven: ['nijika'],
    extraSur: ['ijichi'],
  },
  {
    kanji: ['山田', 'リョウ'],
    korean: ['야마다', '료'],
    romaji: ['Yamada', 'Ryo'],
    extraGiven: ['ryo'],
    extraSur: ['yamada'],
  },
  {
    kanji: ['喜多', '郁代'],
    korean: ['키타', '이쿠요'],
    romaji: ['Kita', 'Ikuyo'],
    extraGiven: ['ikuyo'],
    extraSur: ['kita'],
  },
  // Seiyuu
  {
    kanji: ['雨宮', '天'],
    korean: ['아마미야', '소라'],
    romaji: ['Amamiya', 'Sora'],
    extraGiven: ['sora'],
    extraSur: ['amamiya'],
  },
  {
    kanji: ['麻倉', 'もも'],
    korean: ['아사쿠라', '모모'],
    romaji: ['Asakura', 'Momo'],
    extraGiven: ['momo'],
    extraSur: ['asakura'],
  },
  {
    kanji: ['伊藤', '美来'],
    korean: ['이토', '미쿠'],
    romaji: ['Ito', 'Miku'],
    extraGiven: ['miku'],
    extraSur: ['ito'],
  },
  {
    kanji: ['水瀬', 'いのり'],
    korean: ['미나세', '이노리'],
    romaji: ['Minase', 'Inori'],
    extraGiven: ['inori'],
    extraSur: ['minase'],
  },
  {
    kanji: ['花澤', '香菜'],
    korean: ['하나자와', '카나'],
    romaji: ['Hanazawa', 'Kana'],
    extraGiven: ['kana'],
    extraSur: ['hanazawa'],
  },
  {
    kanji: ['早見', '沙織'],
    korean: ['하야미', '사오리'],
    romaji: ['Hayami', 'Saori'],
    extraGiven: ['saori'],
    extraSur: ['hayami'],
  },
  {
    kanji: ['佐倉', '綾音'],
    korean: ['사쿠라', '아야네'],
    romaji: ['Sakura', 'Ayane'],
    extraGiven: ['ayane'],
    extraSur: ['sakura'],
  },
  {
    kanji: ['悠木', '碧'],
    korean: ['유우키', '아오이'],
    romaji: ['Yuki', 'Aoi'],
    extraGiven: ['aoi'],
    extraSur: ['yuki', 'yuuki'],
  },
  {
    kanji: ['鬼頭', '明里'],
    korean: ['키토', '아카리'],
    romaji: ['Kito', 'Akari'],
    extraGiven: ['akari'],
    extraSur: ['kito'],
  },
  {
    kanji: ['高橋', '李依'],
    korean: ['다카하시', '리에'],
    extraSur: ['takahashi', '타카하시', '다카하시'],
    romaji: ['Takahashi', 'Rie'],
    extraGiven: ['rie'],
  },
  {
    kanji: ['上坂', 'すみれ'],
    korean: ['우에사카', '스미레'],
    romaji: ['Uesaka', 'Sumire'],
    extraGiven: ['sumire'],
    extraSur: ['uesaka'],
  },
  {
    kanji: ['種崎', '敦美'],
    korean: ['타네자키', '아츠미'],
    romaji: ['Tanezaki', 'Atsumi'],
    extraGiven: ['atsumi'],
    extraSur: ['tanezaki'],
  },
  {
    kanji: ['内田', '真礼'],
    korean: ['우치다', '마아야'],
    romaji: ['Uchida', 'Maaya'],
    extraGiven: ['maaya'],
    extraSur: ['uchida'],
  },
  // Idolmaster
  {
    kanji: ['春日', '未来'],
    korean: ['카스가', '미라이'],
    romaji: ['Kasuga', 'Mirai'],
    extraGiven: ['mirai'],
    extraSur: ['kasuga'],
  },
  {
    kanji: ['最上', '静香'],
    korean: ['모가미', '시즈카'],
    romaji: ['Mogami', 'Shizuka'],
    extraGiven: ['shizuka'],
    extraSur: ['mogami'],
  },
  {
    kanji: ['伊吹', '翼'],
    korean: ['이부키', '츠바사'],
    romaji: ['Ibuki', 'Tsubasa'],
    extraGiven: ['tsubasa'],
    extraSur: ['ibuki'],
  },
  {
    kanji: ['七尾', '百合子'],
    korean: ['나나오', '유리코'],
    romaji: ['Nanao', 'Yuriko'],
    extraGiven: ['yuriko'],
    extraSur: ['nanao'],
  },
  {
    kanji: ['箱崎', '星梨花'],
    korean: ['하코자키', '세리카'],
    romaji: ['Hakozaki', 'Serika'],
    extraGiven: ['serika'],
    extraSur: ['hakozaki'],
  },
  {
    kanji: ['北沢', '志保'],
    korean: ['키타자와', '시호'],
    romaji: ['Kitazawa', 'Shiho'],
    extraGiven: ['shiho'],
    extraSur: ['kitazawa'],
  },
  {
    kanji: ['島村', '卯月'],
    korean: ['시마무라', '우즈키'],
    romaji: ['Shimamura', 'Uzuki'],
    extraGiven: ['uzuki'],
    extraSur: ['shimamura'],
  },
  {
    kanji: ['渋谷', '凛'],
    korean: ['시부야', '린'],
    romaji: ['Shibuya', 'Rin'],
    extraGiven: ['rin'],
    extraSur: ['shibuya'],
  },
  {
    kanji: ['本田', '未央'],
    korean: ['혼다', '미오'],
    romaji: ['Honda', 'Mio'],
    extraGiven: ['mio'],
    extraSur: ['honda'],
  },
  {
    kanji: ['天海', '春香'],
    korean: ['아마미', '하루카'],
    romaji: ['Amami', 'Haruka'],
    extraGiven: ['haruka'],
    extraSur: ['amami'],
  },
  {
    kanji: ['如月', '千早'],
    korean: ['키사라기', '치하야'],
    romaji: ['Kisaragi', 'Chihaya'],
    extraGiven: ['chihaya'],
    extraSur: ['kisaragi'],
  },
  {
    kanji: ['星井', '美希'],
    korean: ['호시이', '미키'],
    romaji: ['Hoshii', 'Miki'],
    extraGiven: ['miki'],
    extraSur: ['hoshii'],
  },
  {
    kanji: ['高垣', '楓'],
    korean: ['타카가키', '카에데'],
    romaji: ['Takagaki', 'Kaede'],
    extraGiven: ['kaede'],
    extraSur: ['takagaki'],
  },
  {
    kanji: ['神崎', '蘭子'],
    korean: ['칸자키', '란코'],
    romaji: ['Kanzaki', 'Ranko'],
    extraGiven: ['ranko'],
    extraSur: ['kanzaki'],
  },
  {
    kanji: ['しぐれ', 'うい'],
    korean: ['시구레', '우이'],
    romaji: ['Shigure', 'Ui'],
    extraGiven: ['ui'],
    extraSur: ['shigure'],
  },
  {
    kanji: ['神崎', 'イオリ'],
    korean: ['칸자키', '이오리'],
    romaji: ['Kanzaki', 'Iori'],
    extraGiven: ['iori'],
    extraSur: ['kanzaki'],
  },
  {
    kanji: ['上田', '麗奈'],
    korean: ['우에다', '레이나'],
    romaji: ['Ueda', 'Reina'],
    extraGiven: ['reina'],
    extraSur: ['ueda'],
  },
  {
    kanji: ['楠木', 'ともり'],
    korean: ['쿠스노키', '토모리'],
    romaji: ['Kusunoki', 'Tomori'],
    extraGiven: ['tomori'],
    extraSur: ['kusunoki'],
  },
  {
    kanji: ['小倉', '唯'],
    korean: ['오구라', '유이'],
    romaji: ['Ogura', 'Yui'],
    extraGiven: ['yui'],
    extraSur: ['ogura'],
  },
  {
    kanji: ['宮野', '真守'],
    korean: ['미야노', '마모루'],
    romaji: ['Miyano', 'Mamoru'],
    extraGiven: ['mamoru'],
    extraSur: ['miyano'],
  },
  {
    kanji: ['神谷', '浩史'],
    korean: ['카미야', '히로시'],
    romaji: ['Kamiya', 'Hiroshi'],
    extraGiven: ['hiroshi'],
    extraSur: ['kamiya'],
  },
  {
    kanji: ['杉田', '智和'],
    korean: ['스기타', '토모카즈'],
    romaji: ['Sugita', 'Tomokazu'],
    extraGiven: ['tomokazu'],
    extraSur: ['sugita'],
  },
  {
    kanji: ['中村', '悠一'],
    korean: ['나카무라', '유이치'],
    romaji: ['Nakamura', 'Yuichi'],
    extraGiven: ['yuichi'],
    extraSur: ['nakamura'],
  },
  {
    kanji: ['水樹', '奈々'],
    korean: ['미즈키', '나나'],
    romaji: ['Mizuki', 'Nana'],
    extraGiven: ['nana'],
    extraSur: ['mizuki'],
  },
  {
    kanji: ['坂本', '真綾'],
    korean: ['사카모토', '마아야'],
    romaji: ['Sakamoto', 'Maaya'],
    extraGiven: ['maaya'],
    extraSur: ['sakamoto'],
  },
  {
    kanji: ['梶浦', '由記'],
    korean: ['카지우라', '유키'],
    romaji: ['Kajiura', 'Yuki'],
    extraGiven: ['yuki'],
    extraSur: ['kajiura'],
  },
  {
    kanji: ['澤野', '弘之'],
    korean: ['사와노', '히로유키'],
    romaji: ['Sawano', 'Hiroyuki'],
    extraGiven: ['hiroyuki'],
    extraSur: ['sawano'],
  },
  {
    kanji: ['中島', '美嘉'],
    korean: ['나카시마', '미카'],
    romaji: ['Nakashima', 'Mika'],
    extraGiven: ['mika'],
    extraSur: ['nakashima'],
  },
  {
    kanji: ['平井', '堅'],
    korean: ['히라이', '켄'],
    romaji: ['Hirai', 'Ken'],
    extraGiven: ['ken'],
    extraSur: ['hirai'],
  },
  {
    kanji: ['山下', '達郎'],
    korean: ['야마시타', '타츠로'],
    romaji: ['Yamashita', 'Tatsuro'],
    extraGiven: ['tatsuro'],
    extraSur: ['yamashita'],
  },
  {
    kanji: ['竹内', 'まりや'],
    korean: ['타케우치', '마리야'],
    romaji: ['Takeuchi', 'Mariya'],
    extraGiven: ['mariya'],
    extraSur: ['takeuchi'],
  },
  {
    kanji: ['松原', 'みき'],
    korean: ['마츠바라', '미키'],
    romaji: ['Matsubara', 'Miki'],
    extraGiven: ['miki'],
    extraSur: ['matsubara'],
  },
  {
    kanji: ['百鬼', 'あやめ'],
    korean: ['나키리', '아야메'],
    romaji: ['Nakiri', 'Ayame'],
    extraGiven: ['ayame'],
    extraSur: ['nakiri'],
  },
  {
    kanji: ['大空', 'スバル'],
    korean: ['오오조라', '스바루'],
    romaji: ['Oozora', 'Subaru'],
    extraGiven: ['subaru'],
    extraSur: ['oozora', 'ozora'],
  },
  {
    kanji: ['鏡音', 'リン'],
    korean: ['카가미네', '린'],
    romaji: ['Kagamine', 'Rin'],
    extraGiven: ['rin'],
    extraSur: ['kagamine'],
  },
  {
    kanji: ['鏡音', 'レン'],
    korean: ['카가미네', '렌'],
    romaji: ['Kagamine', 'Len'],
    extraGiven: ['len'],
    extraSur: ['kagamine'],
  },
  {
    kanji: ['巡音', 'ルカ'],
    korean: ['메구리네', '루카'],
    romaji: ['Megurine', 'Luka'],
    extraGiven: ['luka'],
    extraSur: ['megurine'],
  },
  {
    kanji: ['重音', 'テト'],
    korean: ['카사네', '테토'],
    romaji: ['Kasane', 'Teto'],
    extraGiven: ['teto'],
    extraSur: ['kasane'],
  },
  {
    kanji: ['大塚', '愛'],
    korean: ['오오츠카', '아이'],
    romaji: ['Otsuka', 'Ai'],
    extraGiven: ['ai'],
    extraSur: ['otsuka', 'ootsuka'],
  },
  {
    kanji: ['西野', 'カナ'],
    korean: ['니시노', '카나'],
    romaji: ['Nishino', 'Kana'],
    extraGiven: ['kana'],
    extraSur: ['nishino'],
  },
  {
    kanji: ['浜崎', 'あゆみ'],
    korean: ['하마사키', '아유미'],
    romaji: ['Hamasaki', 'Ayumi'],
    extraGiven: ['ayumi'],
    extraSur: ['hamasaki'],
  },
  {
    kanji: ['安室', '奈美恵'],
    korean: ['아무로', '나미에'],
    romaji: ['Amuro', 'Namie'],
    extraGiven: ['namie'],
    extraSur: ['amuro'],
  },
  {
    kanji: ['倉木', '麻衣'],
    korean: ['쿠라키', '마이'],
    romaji: ['Kuraki', 'Mai'],
    extraGiven: ['mai'],
    extraSur: ['kuraki'],
  },
  {
    kanji: ['中島', 'みゆき'],
    korean: ['나카지마', '미유키'],
    romaji: ['Nakajima', 'Miyuki'],
    extraGiven: ['miyuki'],
    extraSur: ['nakajima'],
  },
  {
    kanji: ['尾崎', '豊'],
    korean: ['오자키', '유타카'],
    romaji: ['Ozaki', 'Yutaka'],
    extraGiven: ['yutaka'],
    extraSur: ['ozaki'],
  },
  {
    kanji: ['秦', '基博'],
    korean: ['하타', '모토히로'],
    romaji: ['Hata', 'Motohiro'],
    extraGiven: ['motohiro'],
    extraSur: ['hata'],
  },
  {
    kanji: ['三浦', '大知'],
    korean: ['미우라', '다이치'],
    romaji: ['Miura', 'Daichi'],
    extraGiven: ['daichi'],
    extraSur: ['miura'],
  },
  {
    kanji: ['岡崎', '体育'],
    korean: ['오카자키', '타이이쿠'],
    romaji: ['Okazaki', 'Taiiku'],
    extraGiven: ['taiiku'],
    extraSur: ['okazaki'],
  },
  {
    kanji: ['久石', '譲'],
    korean: ['히사이시', '조'],
    romaji: ['Hisaishi', 'Joe'],
    extraGiven: ['joe', 'jo'],
    extraSur: ['hisaishi'],
  },
  {
    kanji: ['坂本', '龍一'],
    korean: ['사카모토', '류이치'],
    romaji: ['Sakamoto', 'Ryuichi'],
    extraGiven: ['ryuichi'],
    extraSur: ['sakamoto'],
  },
  {
    kanji: ['大森', '元貴'],
    korean: ['오모리', '모토키'],
    romaji: ['Omori', 'Motoki'],
    extraGiven: ['motoki'],
    extraSur: ['omori', 'oomori'],
  },
  {
    kanji: ['平野', '綾'],
    korean: ['히라노', '아야'],
    romaji: ['Hirano', 'Aya'],
    extraGiven: ['aya'],
    extraSur: ['hirano'],
  },
  {
    kanji: ['茅原', '実里'],
    korean: ['치하라', '미노리'],
    romaji: ['Chihara', 'Minori'],
    extraGiven: ['minori'],
    extraSur: ['chihara'],
  },
  {
    kanji: ['堀江', '由衣'],
    korean: ['호리에', '유이'],
    romaji: ['Horie', 'Yui'],
    extraGiven: ['yui'],
    extraSur: ['horie'],
  },
  {
    kanji: ['田村', 'ゆかり'],
    korean: ['타무라', '유카리'],
    romaji: ['Tamura', 'Yukari'],
    extraGiven: ['yukari'],
    extraSur: ['tamura'],
  },
  {
    kanji: ['釘宮', '理恵'],
    korean: ['쿠기미야', '리에'],
    romaji: ['Kugimiya', 'Rie'],
    extraGiven: ['rie'],
    extraSur: ['kugimiya'],
  },
  {
    kanji: ['戸松', '遥'],
    korean: ['토마츠', '하루카'],
    romaji: ['Tomatsu', 'Haruka'],
    extraGiven: ['haruka'],
    extraSur: ['tomatsu'],
  },
  {
    kanji: ['竹達', '彩奈'],
    korean: ['타케타츠', '아야나'],
    romaji: ['Taketatsu', 'Ayana'],
    extraGiven: ['ayana'],
    extraSur: ['taketatsu'],
  },
  {
    kanji: ['日笠', '陽子'],
    korean: ['히카사', '요코'],
    romaji: ['Hikasa', 'Yoko'],
    extraGiven: ['yoko'],
    extraSur: ['hikasa'],
  },
  {
    kanji: ['豊崎', '愛生'],
    korean: ['토요사키', '아키'],
    romaji: ['Toyosaki', 'Aki'],
    extraGiven: ['aki'],
    extraSur: ['toyosaki'],
  },
  {
    kanji: ['儒烏風亭', 'らでん'],
    korean: ['주우후테이', '라덴'],
    romaji: ['Juufuutei', 'Raden'],
    extraGiven: ['raden'],
    extraSur: ['juufuutei'],
  },
  {
    kanji: ['火威', '青'],
    korean: ['히오도시', '아오'],
    romaji: ['Hiodoshi', 'Ao'],
    extraGiven: ['ao'],
    extraSur: ['hiodoshi'],
  },
  {
    kanji: ['一条', '莉々華'],
    korean: ['이치죠', '리리카'],
    romaji: ['Ichijou', 'Ririka'],
    extraGiven: ['ririka'],
    extraSur: ['ichijou', 'ichijo'],
  },
  {
    kanji: ['轟', 'はじめ'],
    korean: ['토도로키', '하지메'],
    romaji: ['Todoroki', 'Hajime'],
    extraGiven: ['hajime'],
    extraSur: ['todoroki'],
  },
  {
    kanji: ['紫咲', 'シオン'],
    korean: ['무라사키', '시온'],
    romaji: ['Murasaki', 'Shion'],
    extraGiven: ['shion'],
    extraSur: ['murasaki'],
  },
  {
    kanji: ['大神', 'ミオ'],
    korean: ['오오카미', '미오'],
    romaji: ['Ookami', 'Mio'],
    extraGiven: ['mio'],
    extraSur: ['ookami', 'okami'],
  },
  {
    kanji: ['不知火', 'フレア'],
    korean: ['시라누이', '후레아'],
    romaji: ['Shiranui', 'Flare'],
    extraGiven: ['flare'],
    extraSur: ['shiranui'],
  },
  {
    kanji: ['白銀', 'ノエル'],
    korean: ['시로가네', '노엘'],
    romaji: ['Shirogane', 'Noel'],
    extraGiven: ['noel'],
    extraSur: ['shirogane'],
  },
  {
    kanji: ['雪花', 'ラミィ'],
    korean: ['유키하나', '라미'],
    romaji: ['Yukihana', 'Lamy'],
    extraGiven: ['lamy'],
    extraSur: ['yukihana'],
  },
  {
    kanji: ['桃鈴', 'ねね'],
    korean: ['모모스즈', '네네'],
    romaji: ['Momosuzu', 'Nene'],
    extraGiven: ['nene'],
    extraSur: ['momosuzu'],
  },
  {
    kanji: ['獅白', 'ぼたん'],
    korean: ['시시로', '보탄'],
    romaji: ['Shishiro', 'Botan'],
    extraGiven: ['botan'],
    extraSur: ['shishiro'],
  },
  {
    kanji: ['尾丸', 'ポルカ'],
    korean: ['오마루', '폴카'],
    romaji: ['Omaru', 'Polka'],
    extraGiven: ['polka'],
    extraSur: ['omaru'],
  },
  {
    kanji: ['鷹嶺', 'ルイ'],
    korean: ['타카네', '루이'],
    romaji: ['Takane', 'Lui'],
    extraGiven: ['lui'],
    extraSur: ['takane'],
  },
  {
    kanji: ['博衣', 'こより'],
    korean: ['하쿠이', '코요리'],
    romaji: ['Hakui', 'Koyori'],
    extraGiven: ['koyori'],
    extraSur: ['hakui'],
  },
  {
    kanji: ['沙花叉', 'クロヱ'],
    korean: ['사카마타', '클로에'],
    romaji: ['Sakamata', 'Chloe'],
    extraGiven: ['chloe'],
    extraSur: ['sakamata'],
  },
  {
    kanji: ['風真', 'いろは'],
    korean: ['카자마', '이로하'],
    romaji: ['Kazama', 'Iroha'],
    extraGiven: ['iroha'],
    extraSur: ['kazama'],
  },
  {
    kanji: ['大石', '昌良'],
    korean: ['오오이시', '마사요시'],
    romaji: ['Oishi', 'Masayoshi'],
    extraGiven: ['masayoshi'],
    extraSur: ['oishi', 'ooishi'],
  },
  {
    kanji: ['オーイシ', 'マサヨシ'],
    korean: ['오오이시', '마사요시'],
    romaji: ['Oishi', 'Masayoshi'],
    extraGiven: ['masayoshi'],
    extraSur: ['oishi', 'ooishi'],
  },
  {
    kanji: ['鈴木', '雅之'],
    korean: ['스즈키', '마사유키'],
    romaji: ['Suzuki', 'Masayuki'],
    extraGiven: ['masayuki'],
    extraSur: ['suzuki'],
  },
  {
    kanji: ['鈴木', '愛理'],
    korean: ['스즈키', '아이리'],
    romaji: ['Suzuki', 'Airi'],
    extraGiven: ['airi'],
    extraSur: ['suzuki'],
  },
  {
    kanji: ['鈴木', 'このみ'],
    korean: ['스즈키', '코노미'],
    romaji: ['Suzuki', 'Konomi'],
    extraGiven: ['konomi'],
    extraSur: ['suzuki'],
  },
  {
    kanji: ['藍井', 'エイル'],
    korean: ['아오이', '에이루'],
    romaji: ['Aoi', 'Eir'],
    extraGiven: ['eir', '에이루', '에일'],
    extraSur: ['aoi'],
  },
  {
    kanji: ['高橋', '洋子'],
    korean: ['타카하시', '요코'],
    romaji: ['Takahashi', 'Yoko'],
    extraGiven: ['yoko'],
    extraSur: ['takahashi'],
  },
  {
    kanji: ['和田', '光司'],
    korean: ['와다', '코지'],
    romaji: ['Wada', 'Koji'],
    extraGiven: ['koji'],
    extraSur: ['wada'],
  },
  {
    kanji: ['福山', '雅治'],
    korean: ['후쿠야마', '마사하루'],
    romaji: ['Fukuyama', 'Masaharu'],
    extraGiven: ['masaharu'],
    extraSur: ['fukuyama'],
  },
  {
    kanji: ['桑田', '佳祐'],
    korean: ['쿠와타', '케이스케'],
    romaji: ['Kuwata', 'Keisuke'],
    extraGiven: ['keisuke'],
    extraSur: ['kuwata'],
  },
  {
    kanji: ['小田', '和正'],
    korean: ['오다', '카즈마사'],
    romaji: ['Oda', 'Kazumasa'],
    extraGiven: ['kazumasa'],
    extraSur: ['oda'],
  },
  {
    kanji: ['玉置', '浩二'],
    korean: ['타마키', '코지'],
    romaji: ['Tamaki', 'Koji'],
    extraGiven: ['koji'],
    extraSur: ['tamaki'],
  },
  {
    kanji: ['徳永', '英明'],
    korean: ['토쿠나가', '히데아키'],
    romaji: ['Tokunaga', 'Hideaki'],
    extraGiven: ['hideaki'],
    extraSur: ['tokunaga'],
  },
  {
    kanji: ['槇原', '敬之'],
    korean: ['마키하라', '노리유키'],
    romaji: ['Makihara', 'Noriyuki'],
    extraGiven: ['noriyuki'],
    extraSur: ['makihara'],
  },
  {
    kanji: ['家入', 'レオ'],
    korean: ['이에이리', '레오'],
    romaji: ['Ieiri', 'Leo'],
    extraGiven: ['leo'],
    extraSur: ['ieiri'],
  },
  {
    kanji: ['上白石', '萌音'],
    korean: ['카미시라이시', '모네'],
    romaji: ['Kamishiraishi', 'Mone'],
    extraGiven: ['mone'],
    extraSur: ['kamishiraishi'],
  },
  {
    kanji: ['広瀬', '香美'],
    korean: ['히로세', '코미'],
    romaji: ['Hirose', 'Komi'],
    extraGiven: ['komi'],
    extraSur: ['hirose'],
  },
  {
    kanji: ['東山', '奈央'],
    korean: ['토야마', '나오'],
    romaji: ['Toyama', 'Nao'],
    extraGiven: ['nao'],
    extraSur: ['toyama'],
  },
  {
    kanji: ['南條', '愛乃'],
    korean: ['난죠', '요시노'],
    romaji: ['Nanjo', 'Yoshino'],
    extraGiven: ['yoshino'],
    extraSur: ['nanjo', 'nanjou'],
  },
  {
    kanji: ['三森', 'すずこ'],
    korean: ['미모리', '스즈코'],
    romaji: ['Mimori', 'Suzuko'],
    extraGiven: ['suzuko'],
    extraSur: ['mimori'],
  },
  {
    kanji: ['小原', '好美'],
    korean: ['코하라', '코노미'],
    romaji: ['Kohara', 'Konomi'],
    extraGiven: ['konomi'],
    extraSur: ['kohara'],
  },
  {
    kanji: ['古賀', '葵'],
    korean: ['코가', '아오이'],
    romaji: ['Koga', 'Aoi'],
    extraGiven: ['aoi'],
    extraSur: ['koga'],
  },
  {
    kanji: ['羊宮', '妃那'],
    korean: ['요미야', '히나'],
    romaji: ['Yomiya', 'Hina'],
    extraGiven: ['hina'],
    extraSur: ['yomiya'],
  },
  {
    kanji: ['長谷川', '育美'],
    korean: ['하세가와', '이쿠미'],
    romaji: ['Hasegawa', 'Ikumi'],
    extraGiven: ['ikumi'],
    extraSur: ['hasegawa'],
  },
  {
    kanji: ['青山', '吉能'],
    korean: ['아오야마', '요시노'],
    romaji: ['Aoyama', 'Yoshino'],
    extraGiven: ['yoshino'],
    extraSur: ['aoyama'],
  },
  {
    kanji: ['今津', '渉'],
    korean: ['이마즈', '아유무'],
    romaji: ['Imazu', 'Ayumu'],
    extraGiven: ['ayumu'],
    extraSur: ['imazu'],
  },
  {
    kanji: ['中島', '健人'],
    korean: ['나카지마', '켄토'],
    romaji: ['Nakajima', 'Kento'],
    extraGiven: ['kento'],
    extraSur: ['nakajima'],
  },
  {
    kanji: ['千葉', '雄喜'],
    korean: ['치바', '유키'],
    romaji: ['Chiba', 'Yuki'],
    extraGiven: ['yuki'],
    extraSur: ['chiba'],
  },
  {
    kanji: ['メガ', 'シンノスケ'],
    korean: ['메가', '신노스케'],
    romaji: ['Mega', 'Shinnosuke'],
    extraGiven: ['shinnosuke'],
    extraSur: ['mega'],
  },
  {
    kanji: ['三宅', '日向'],
    korean: ['미야케', '히나타'],
    romaji: ['Miyake', 'Hinata'],
    extraGiven: ['hinata'],
    extraSur: ['miyake'],
  },
  {
    kanji: ['君島', '大空'],
    korean: ['키미시마', '오오조라'],
    romaji: ['Kimishima', 'Ohzora'],
    extraGiven: ['ohzora', 'oozora', 'ozora'],
    extraSur: ['kimishima'],
  },
  {
    kanji: ['紫', '今'],
    korean: ['무라사키', '이마'],
    romaji: ['Murasaki', 'Ima'],
    extraGiven: ['ima'],
    extraSur: ['murasaki'],
  },
  {
    kanji: ['しのだ', 'りょうすけ'],
    korean: ['시노다', '료스케'],
    romaji: ['Shinoda', 'Ryosuke'],
    extraGiven: ['ryosuke'],
    extraSur: ['shinoda'],
  },
  {
    kanji: ['谷', '優希'],
    korean: ['타니', '유우키'],
    romaji: ['Tani', 'Yuuki'],
    extraGiven: ['yuuki', 'yuki'],
    extraSur: ['tani'],
  },
  {
    kanji: ['川崎', '鷹也'],
    korean: ['카와사키', '타카야'],
    romaji: ['Kawasaki', 'Takaya'],
    extraGiven: ['takaya'],
    extraSur: ['kawasaki'],
  },
  {
    kanji: ['ヒグチ', 'アイ'],
    korean: ['히구치', '아이'],
    romaji: ['Higuchi', 'Ai'],
    extraGiven: ['ai'],
    extraSur: ['higuchi'],
  },
  {
    kanji: ['須田', '景凪'],
    korean: ['스다', '케이나'],
    romaji: ['Suda', 'Keina'],
    extraGiven: ['keina'],
    extraSur: ['suda'],
  },
  {
    kanji: ['こっちの', 'けんと'],
    korean: ['콧치노', '켄토'],
    romaji: ['Kocchi no', 'Kento'],
    extraGiven: ['kento'],
    extraSur: ['kocchino'],
  },
  {
    kanji: ['平井', '大'],
    korean: ['히라이', '다이'],
    romaji: ['Hirai', 'Dai'],
    extraGiven: ['dai'],
    extraSur: ['hirai'],
  },
  {
    kanji: ['清水', '翔太'],
    korean: ['시미즈', '쇼타'],
    romaji: ['Shimizu', 'Shota'],
    extraGiven: ['shota'],
    extraSur: ['shimizu'],
  },
  {
    kanji: ['倖田', '來未'],
    korean: ['코다', '쿠미'],
    romaji: ['Koda', 'Kumi'],
    extraGiven: ['kumi'],
    extraSur: ['koda'],
  },
  {
    kanji: ['井上', '苑子'],
    korean: ['이노우에', '소노코'],
    romaji: ['Inoue', 'Sonoko'],
    extraGiven: ['sonoko'],
    extraSur: ['inoue'],
  },
  {
    kanji: ['上白石', '萌歌'],
    korean: ['카미시라이시', '모카'],
    romaji: ['Kamishiraishi', 'Moka'],
    extraGiven: ['moka'],
    extraSur: ['kamishiraishi'],
  },
  {
    kanji: ['手嶌', '葵'],
    korean: ['테시마', '아오이'],
    romaji: ['Teshima', 'Aoi'],
    extraGiven: ['aoi'],
    extraSur: ['teshima'],
  },
  {
    kanji: ['松任谷', '由実'],
    korean: ['마츠토야', '유미'],
    romaji: ['Matsutoya', 'Yumi'],
    extraGiven: ['yumi'],
    extraSur: ['matsutoya'],
  },
  {
    kanji: ['松田', '聖子'],
    korean: ['마츠다', '세이코'],
    romaji: ['Matsuda', 'Seiko'],
    extraGiven: ['seiko'],
    extraSur: ['matsuda'],
  },
  {
    kanji: ['中森', '明菜'],
    korean: ['나카모리', '아키나'],
    romaji: ['Nakamori', 'Akina'],
    extraGiven: ['akina'],
    extraSur: ['nakamori'],
  },
  {
    kanji: ['大黒', '摩季'],
    korean: ['오오구로', '마키'],
    romaji: ['Ohguro', 'Maki'],
    extraGiven: ['maki'],
    extraSur: ['ohguro', 'oguro'],
  },
  {
    kanji: ['大貫', '妙子'],
    korean: ['오오누키', '타에코'],
    romaji: ['Onuki', 'Taeko'],
    extraGiven: ['taeko'],
    extraSur: ['onuki', 'oonuki'],
  },
  {
    kanji: ['大橋', '純子'],
    korean: ['오오하시', '준코'],
    romaji: ['Ohashi', 'Junko'],
    extraGiven: ['junko'],
    extraSur: ['ohashi', 'oohashi'],
  },
  {
    kanji: ['大原', '櫻子'],
    korean: ['오오하라', '사쿠라코'],
    romaji: ['Ohara', 'Sakurako'],
    extraGiven: ['sakurako'],
    extraSur: ['ohara', 'oohara'],
  },
  {
    kanji: ['春奈', 'るな'],
    korean: ['하루나', '루나'],
    romaji: ['Haruna', 'Luna'],
    extraGiven: ['luna', 'runa'],
    extraSur: ['haruna'],
  },
  {
    kanji: ['花海', '咲季'],
    korean: ['하나미', '사키'],
    romaji: ['Hanami', 'Saki'],
    extraGiven: ['saki'],
    extraSur: ['hanami'],
  },
  {
    kanji: ['月村', '手毬'],
    korean: ['츠키무라', '테마리'],
    romaji: ['Tsukimura', 'Temari'],
    extraGiven: ['temari'],
    extraSur: ['tsukimura'],
  },
  {
    kanji: ['藤田', 'ことね'],
    korean: ['후지타', '코토네'],
    romaji: ['Fujita', 'Kotone'],
    extraGiven: ['kotone'],
    extraSur: ['fujita'],
  },
  {
    kanji: ['鈴代', '紗弓'],
    korean: ['스즈시로', '사유미'],
    romaji: ['Suzushiro', 'Sayumi'],
    extraGiven: ['sayumi'],
    extraSur: ['suzushiro'],
  },
  {
    kanji: ['水野', '朔'],
    korean: ['미즈노', '사쿠'],
    romaji: ['Mizuno', 'Saku'],
    extraGiven: ['saku'],
    extraSur: ['mizuno'],
  },
];

const JAPANESE_ROMAJI_SURNAMES_SET = new Set([
  'sato', 'suzuki', 'takahashi', 'tanaka', 'watanabe', 'ito', 'yamamoto', 'nakamura', 'kobayashi', 'kato',
  'yoshida', 'yamada', 'sasaki', 'yamaguchi', 'matsumoto', 'inoue', 'kimura', 'hayashi', 'shimizu', 'yamazaki',
  'mori', 'abe', 'ikeda', 'hashimoto', 'yamashita', 'ishikawa', 'nakajima', 'nakashima', 'maeda', 'fujita',
  'ogawa', 'goto', 'okada', 'hasegawa', 'murakami', 'kondo', 'ishii', 'saito', 'sakamoto', 'endo',
  'aoki', 'fujii', 'nishimura', 'fukuda', 'ota', 'miura', 'fujiwara', 'okamoto', 'matsuda', 'nakagawa',
  'nakano', 'harada', 'ono', 'tamura', 'takeuchi', 'kaneko', 'wada', 'nakayama', 'ishida', 'ueda',
  'morita', 'hara', 'shibata', 'sakai', 'kudo', 'yokoyama', 'miyazaki', 'miyamoto', 'uchida', 'takagi',
  'ando', 'taniguchi', 'ohno', 'ono', 'maruyama', 'imai', 'takada', 'fujimoto', 'takeda', 'murata',
  'ueno', 'sugiyama', 'masuda', 'sugawara', 'hirano', 'koyama', 'otsuka', 'chiba', 'kubo', 'matsui',
  'iwasaki', 'sakurai', 'kinoshita', 'noguchi', 'matsuo', 'nomura', 'kikuchi', 'sano', 'onishi', 'sugimoto',
  'arai', 'komatsu', 'hoshino', 'yonezu', 'kitani', 'oishi', 'sawano', 'kajiura', 'hisaishi', 'kanzaki',
  'kusunoki', 'minase', 'hanazawa', 'hayami', 'sakura', 'kito', 'uesaka', 'tanezaki', 'ogura', 'miyano',
  'kamiya', 'sugita', 'mizuki', 'horie', 'kugimiya', 'tomatsu', 'taketatsu', 'hikasa', 'toyosaki', 'chihara',
  'toyama', 'kohara', 'koga', 'yomiya', 'aoyama', 'suzushiro', 'mizuno', 'imazu', 'miyake', 'kimishima',
  'shinoda', 'kawasaki', 'higuchi', 'suda', 'hirai', 'koda', 'kamishiraishi', 'teshima', 'matsutoya', 'nakamori',
  'ohguro', 'onuki', 'ohashi', 'ohara', 'haruna', 'orisaka', 'otoda', 'funatsu',
]);

export function getJapaneseArtistNames(targets: string | string[]): { hasJapanesePerson: boolean; givenNames: Set<string>; surnames: Set<string>; fullNames: Set<string> } {
  const targetList = Array.isArray(targets) ? targets : [targets];
  const givenNames = new Set();
  const surnames = new Set();
  const fullNames = new Set();
  let hasJapanesePerson = false;

  for (const person of JAPANESE_PERSON_ARTISTS) {
    const kanjiFull = person.kanji.join('');
    const korFullSpace = person.korean.join(' ');
    const korFullNoSpace = person.korean.join('');
    const romaji1 = person.romaji.join(' ');
    const romaji2 = [person.romaji[1], person.romaji[0]].join(' ');
    const romajiNoSpace1 = person.romaji.join('').toLowerCase();
    const romajiNoSpace2 = [person.romaji[1], person.romaji[0]].join('').toLowerCase();
    const korFullVariants = expandJapaneseKoreanVariants(korFullSpace);

    const isPresent = targetList.some(t => {
      if (!t || typeof t !== 'string') return false;
      const lowerT = t.toLowerCase();
      const normT = lowerT.replace(/[\p{P}\p{Z}\s]/gu, '');
      return t.includes(kanjiFull) ||
             normT.includes(kanjiFull) ||
             normT.includes(korFullNoSpace) ||
             korFullVariants.some(kv => normT.includes(kv.replace(/\s+/g, ''))) ||
             normT.includes(romajiNoSpace1) ||
             normT.includes(romajiNoSpace2) ||
             lowerT.includes(romaji1.toLowerCase()) ||
             lowerT.includes(romaji2.toLowerCase());
    });

    if (isPresent) {
      hasJapanesePerson = true;

      // Given names (이름)
      givenNames.add(person.kanji[1]);
      givenNames.add(person.korean[1]);
      for (const gv of expandJapaneseKoreanVariants(person.korean[1])) {
        givenNames.add(gv);
      }
      givenNames.add(person.romaji[1]);
      if (person.extraGiven) {
        for (const g of person.extraGiven) givenNames.add(g);
      }

      // Surnames (성)
      surnames.add(person.kanji[0]);
      surnames.add(person.korean[0]);
      for (const sv of expandJapaneseKoreanVariants(person.korean[0])) {
        surnames.add(sv);
      }
      surnames.add(person.romaji[0]);
      if (person.extraSur) {
        for (const s of person.extraSur) surnames.add(s);
      }

      // Full names (풀네임)
      fullNames.add(kanjiFull);
      fullNames.add(korFullSpace);
      fullNames.add(korFullNoSpace);
      for (const fv of korFullVariants) {
        fullNames.add(fv);
      }
      fullNames.add(romaji1);
      fullNames.add(romaji2);
    }
  }

  // Fallback: detect 2-word Romaji Japanese person names via JAPANESE_ROMAJI_SURNAMES_SET
  for (const rawT of targetList) {
    if (!rawT || typeof rawT !== 'string') continue;
    const parts = rawT.split(/\s*(?:,|&|\+|×|\s+x\s+|\s+feat\.?\s+|\s+ft\.?\s+)\s*/i);
    for (const part of parts) {
      const cleaned = part.replace(/\s*\(.*?\)\s*/g, ' ').trim();
      if (!/^[a-zA-Z]+\s+[a-zA-Z]+$/.test(cleaned)) continue;
      const [w1, w2] = cleaned.split(/\s+/);
      const lw1 = w1.toLowerCase();
      const lw2 = w2.toLowerCase();
      if (JAPANESE_ROMAJI_SURNAMES_SET.has(lw2) && !JAPANESE_ROMAJI_SURNAMES_SET.has(lw1)) {
        hasJapanesePerson = true;
        givenNames.add(w1);
        surnames.add(w2);
        fullNames.add(`${w1} ${w2}`);
        fullNames.add(`${w2} ${w1}`);
      } else if (JAPANESE_ROMAJI_SURNAMES_SET.has(lw1) && !JAPANESE_ROMAJI_SURNAMES_SET.has(lw2)) {
        hasJapanesePerson = true;
        surnames.add(w1);
        givenNames.add(w2);
        fullNames.add(`${w1} ${w2}`);
        fullNames.add(`${w2} ${w1}`);
      }
    }
  }

  return { hasJapanesePerson, givenNames, surnames, fullNames };
}

/**
 * Curated Global Artists Map (Western & K-Pop Romanized)
 */
export const GLOBAL_ARTISTS_MAP: Record<string, string> = {
  // Western Pop / Rock
  'taylor swift': '테일러 스위프트',
  'bruno mars': '브루노 마스',
  'ed sheeran': '에드 시런',
  'the weeknd': '위켄드',
  'maroon 5': '마룬 5',
  'maroon5': '마룬 5',
  'adele': '아델',
  'queen': '퀸',
  'charlie puth': '찰리 푸스',
  'billie eilish': '빌리 아일리시',
  'ariana grande': '아리아나 그란데',
  'justin bieber': '저스틴 비버',
  'dua lipa': '두아 리파',
  'post malone': '포스트 말론',
  'coldplay': '콜드플레이',
  'lady gaga': '레이디 가가',
  'kanye west': '칸예 웨스트',
  'kendrick lamar': '켄드릭 라마',
  'eminem': '에미넴',
  'michael jackson': '마이클 잭슨',
  'beyonce': '비욘세',
  'beyoncé': '비욘세',
  'rihanna': '리한나',
  'drake': '드레이크',
  'sam smith': '샘 스미스',
  'sza': '시저',
  'olivia rodrigo': '올리비아 로드리고',
  'harry styles': '해리 스타일스',
  'shawn mendes': '숀 멘데스',
  'imagine dragons': '이매진 드래곤스',
  'sia': '시아',
  'avicii': '아비치',
  'alan walker': '앨런 워커',
  'zedd': '제드',
  'the chainsmokers': '체인스모커스',
  'oasis': '오아시스',
  'the beatles': '비틀즈',
  'linkin park': '린킨 파크',
  'green day': '그린 데이',
  'muse': '뮤즈',
  'radiohead': '라디오헤드',
  'my chemical romance': '마이 케미컬 로맨스',
  'one republic': '원리퍼블릭',
  'onerepublic': '원리퍼블릭',
  'one direction': '원 디렉션',
  'lauv': '라우브',
  'lany': '레이니',
  'honne': '혼네',
  'troye sivan': '트로이 시반',
  'conan gray': '코난 그레이',
  'sabrina carpenter': '사브리나 카펜터',
  'doja cat': '도자 캣',
  'katy perry': '케이티 페리',
  'bruno major': '브루노 메이저',
  'daniel caesar': '다니엘 시저',
  'frank ocean': '프랭크 오션',
  'travis scott': '트래비스 스콧',
  'metro boomin': '메트로 부민',
  'anne-marie': '앤마리',
  'anne marie': '앤마리',
  'jeremy zucker': '제레미 주커',
  'etham': '이담',
  'pink sweat$': '핑크 스웨츠',
  'pink sweats': '핑크 스웨츠',
  'ajr': '에이제이알',
  'keshi': '케시',
  'joji': '조지',
  'new hope club': '뉴 호프 클럽',
  '5 seconds of summer': '파이브 세컨즈 오브 서머',
  'benson boone': '벤슨 분',
  'chappell roan': '채플 론',
  'hozier': '호지어',
  'teddy swims': '테디 스윔스',
  'tate mcrae': '테이트 맥레이',
  'camila cabello': '카밀라 카베요',
  'selena gomez': '셀레나 고메즈',
  'miley cyrus': '마일리 사이러스',
  'demi lovato': '데미 로바토',
  'nicki minaj': '니키 미나즈',
  'cardi b': '카디 비',
  'megan thee stallion': '메건 더 스탤리언',
  'lil nas x': '릴 나스 엑스',
  'swae lee': '스웨 리',
  'halsey': '할시',
  'khalid': '칼리드',
  'bazzi': '바지',
  'elton john': '엘튼 존',
  'billy joel': '빌리 조엘',
  'david bowie': '데이비드 보위',
  'stevie wonder': '스티비 원더',
  'whitney houston': '휘트니 휴스턴',
  'mariah carey': '머라이어 캐리',
  'celine dion': '셀린 디온',
  'madonna': '마돈나',
  'britney spears': '브리트니 스피어스',
  'backstreet boys': '백스트리트 보이즈',
  'westlife': '웨스트라이프',
  'nsync': '엔싱크',
  'abba': '아바',
  'bon jovi': '본 조비',
  'guns n\' roses': '건즈 앤 로지스',
  'nirvana': '너바나',
  'metallica': '메탈리카',
  'ac/dc': '에이씨디씨',
  'red hot chili peppers': '레드 핫 칠리 페퍼스',
  'foo fighters': '푸 파이터스',
  'arctic monkeys': '아크틱 몽키즈',
  'the 1975': '더 1975',
  'cigarettes after sex': '시가렛 애프터 섹스',
  'lana del rey': '라나 델 레이',
  'lorde': '로드',
  'tame impala': '테임 임팔라',
  'gorillaz': '고릴라즈',
  'daft punk': '다프트 펑크',
  'calvin harris': '캘빈 해리스',
  'david guetta': '데이비드 게타',
  'marshmello': '마시멜로',
  'kygo': '카이고',
  'martin garrix': '마틴 개릭스',
  'tiesto': '티에스토',
  'skrillex': '스크릴렉스',
  'diplo': '디플로',
  'major lazer': '메이저 레이저',
  'clean bandit': '클린 밴딧',
  'disclosure': '디스클로저',
  'fkj': '에프케이제이',
  'tom misch': '톰 미쉬',
  'prep': '프렙',
  'tahiti 80': '타히티 80',

  // K-Pop Groups & Bands
  'newjeans': '뉴진스',
  'blackpink': '블랙핑크',
  'twice': '트와이스',
  'ive': '아이브',
  'aespa': '에스파',
  'le sserafim': '르세라핌',
  'lesserafim': '르세라핌',
  'day6': '데이식스',
  'day6 (even of day)': '데이식스 이븐 오브 데이',
  'even of day': '이븐 오브 데이',
  'qwer': '큐더블유이알',
  'exo': '엑소',
  'exo-k': '엑소케이',
  'exo-cbx': '엑소 첸백시',
  'seventeen': '세븐틴',
  'bss': '부석순',
  'boo seok soon': '부석순',
  'bts': '방탄소년단',
  'bangtan boys': '방탄소년단',
  'god': '지오디',
  'g.o.d': '지오디',
  'zico': '지코',
  'iu': '아이유',
  'snsd': '소녀시대',
  'girls generation': '소녀시대',
  'girls\' generation': '소녀시대',
  'girls\' generation-tts': '소녀시대-태티서',
  'red velvet': '레드벨벳',
  'nct': '엔시티',
  'nct 127': '엔시티 127',
  'nct dream': '엔시티 드림',
  'nct wish': '엔시티 위시',
  'nct u': '엔시티 유',
  'wayv': '웨이션브이',
  'superm': '슈퍼엠',
  'stray kids': '스트레이 키즈',
  'txt': '투모로우바이투게더',
  'tomorrow x together': '투모로우바이투게더',
  'enhypen': '엔하이픈',
  'shinee': '샤이니',
  'bigbang': '빅뱅',
  'big bang': '빅뱅',
  '2ne1': '투애니원',
  'itzy': '있지',
  'nmixx': '엔믹스',
  'stayc': '스테이씨',
  'riize': '라이즈',
  'boynextdoor': '보이넥스트도어',
  'zerobaseone': '제로베이스원',
  'zb1': '제로베이스원',
  'tws': '투어스',
  'illit': '아일릿',
  'babymonster': '베이비몬스터',
  'kiss of life': '키스오브라이프',
  'fifthy fifty': '피프티피프티',
  'fifty fifty': '피프티피프티',
  'tripleS': '트리플에스',
  'triples': '트리플에스',
  '(g)i-dle': '(여자)아이들',
  'gidle': '(여자)아이들',
  '(여자)아이들': '(여자)아이들',
  'i-dle': '아이들',
  'wonder girls': '원더걸스',
  'super junior': '슈퍼주니어',
  'kara': '카라',
  '2pm': '투피엠',
  '2am': '투에이엠',
  'cnblue': '씨엔블루',
  'ftisland': '에프티아일랜드',
  'ft island': '에프티아일랜드',
  'btob': '비투비',
  'monsta x': '몬스타엑스',
  'ateez': '에이티즈',
  'treasure': '트레저',
  'the boyz': '더보이즈',
  'fromis_9': '프로미스나인',
  'fromis 9': '프로미스나인',
  'mamamoo': '마마무',
  'oh my girl': '오마이걸',
  'wjsn': '우주소녀',
  'cosmic girls': '우주소녀',
  'apink': '에이핑크',
  'gfriend': '여자친구',
  'viviz': '비비지',
  'iz*one': '아이즈원',
  'izone': '아이즈원',
  'wanna one': '워너원',
  'ioi': '아이오아이',
  'i.o.i': '아이오아이',
  'brave girls': '브레이브걸스',
  'bbgirls': '브브걸',
  'sistar': '씨스타',
  'sistar19': '씨스타19',
  'girl\'s day': '걸스데이',
  'girls day': '걸스데이',
  'aoa': '에이오에이',
  'exid': '이엑스아이디',
  't-ara': '티아라',
  'tara': '티아라',
  'f(x)': '에프엑스',
  'fx': '에프엑스',
  'miss a': '미쓰에이',
  'brown eyed girls': '브라운아이드걸스',
  'brown eyed soul': '브라운아이드소울',
  'brown eyes': '브라운아이즈',
  'tvxq!': '동방신기',
  'tvxq': '동방신기',
  'infinite': '인피니트',
  'highlight': '하이라이트',
  'beast': '비스트',
  'block b': '블락비',
  'winner': '위너',
  'ikon': '아이콘',
  'got7': '갓세븐',
  'pentagon': '펜타곤',
  'astro': '아스트로',
  'plave': '플레이브',
  'akmu': '악뮤',
  'akdong musician': '악동뮤지션',
  'bol4': '볼빨간사춘기',
  'bolbbalgan4': '볼빨간사춘기',
  '10cm': '십센치',
  'davichi': '다비치',
  'melomance': '멜로망스',
  'jannabi': '잔나비',
  'lucy': '루시',
  'n.flying': '엔플라잉',
  'nflying': '엔플라잉',
  'xdinary heroes': '엑스디너리 히어로즈',
  'hyukoh': '혁오',
  'the black skirts': '검정치마',
  'car, the garden': '카더가든',
  'car the garden': '카더가든',
  'carthegarden': '카더가든',
  'silica gel': '실리카겔',
  'wave to earth': '웨이브 투 어스',
  'se so neon': '새소년',
  'thornapple': '쏜애플',
  'surl': '설',
  'lacuna': '라쿠나',
  'touched': '터치드',
  'nerd connection': '너드커넥션',
  'peppertones': '페퍼톤스',
  'nell': '넬',
  'buzz': '버즈',
  'm.c the max': '엠씨더맥스',
  'm.c. the max': '엠씨더맥스',
  'mc the max': '엠씨더맥스',
  'mcthemax': '엠씨더맥스',
  'sg wannabe': '에스지워너비',
  'v.o.s': '브이오에스',
  'vos': '브이오에스',
  'monday kiz': '먼데이 키즈',
  '4men': '포맨',
  'december': '디셈버',
  'noel': '노을',
  '2bic': '투빅',
  'gavy nj': '가비엔제이',
  'seeya': '씨야',
  'big mama': '빅마마',
  'busker busker': '버스커 버스커',
  'ulala session': '울랄라세션',
  'epik high': '에픽하이',
  'dynamic duo': '다이나믹 듀오',
  'leessang': '리쌍',
  'mighty mouth': '마이티 마우스',
  'freestyle': '프리스타일',
  'geeks': '긱스',
  'homies': '호미들',
  'yb': '윤도현밴드',
  'yoon do hyun band': '윤도현밴드',
  'jaurim': '자우림',
  'cherry filter': '체리필터',
  'crying nut': '크라잉넛',
  'no brain': '노브레인',
  'boohwal': '부활',
  'delispice': '델리스파이스',
  'roller coaster': '롤러코스터',
  'clazziquai': '클래지콰이',
  'clazziquai project': '클래지콰이',
  'loveholic': '러브홀릭',
  'loveholics': '러브홀릭스',
  '015b': '공일오비',
  'exhibition': '전람회',
  'panic': '패닉',
  'carnival': '카니발',
  'toy': '토이',
  'sanulrim': '산울림',
  'songgolmae': '송골매',
  'wild chrysanthemum': '들국화',
  'sinawi': '시나위',
  'baekdusan': '백두산',
  'h.o.t.': '에이치오티',
  'h.o.t': '에이치오티',
  's.e.s.': '에스이에스',
  's.e.s': '에스이에스',
  'shinhwa': '신화',
  'sechs kies': '젝스키스',
  'sechskies': '젝스키스',
  'fin.k.l': '핑클',
  'finkl': '핑클',
  'baby v.o.x': '베이비복스',
  'chakra': '샤크라',
  'jewelry': '쥬얼리',
  'sugar': '슈가',
  'milk': '밀크',
  'nrg': '엔알지',
  '1tym': '원타임',
  'jinusean': '지누션',
  'turbo': '터보',
  'cool': '쿨',
  'koyote': '코요태',
  'roo\'ra': '룰라',
  'roora': '룰라',
  'deux': '듀스',
  'dj doc': '디제이디오씨',
  'clon': '클론',
  'ref': '알이에프',
  'r.ef': '알이에프',
  'noise': '노이즈',
  'solid': '솔리드',
  'up': '유피',
  'country kko kko': '컨츄리꼬꼬',
  'sharp': '샵',
  's#arp': '샵',
  'space a': '스페이스 에이',
  'tashannie': '타샤니',
  'rumble fish': '럼블피쉬',
  'paran': '파란',
  'ss501': '더블에스501',
  'ukiss': '유키스',
  'u-kiss': '유키스',
  'mblaq': '엠블랙',
  'ze:a': '제국의아이들',
  'teen top': '틴탑',
  'b1a4': '비원에이포',
  'b.a.p': '비에이피',
  'vixx': '빅스',
  'nu\'est': '뉴이스트',
  'nuest': '뉴이스트',
  'sf9': '에스에프나인',
  'cravity': '크래비티',
  'oneus': '원어스',
  'onewe': '원위',
  'verivery': '베리베리',
  'onf': '온앤오프',
  'golden child': '골든차일드',
  'ab6ix': '에이비식스',
  'cix': '씨아이엑스',
  'p1harmony': '피원하모니',
  'tempest': '템페스트',
  'epex': '이펙스',
  'xikers': '싸이커스',
  'evnne': '이븐',
  'n.ssign': '엔싸인',
  '8turn': '에잇턴',
  'amp&one': '앰퍼샌드원',
  'nexz': '넥스지',
  'kickflip': '킥플립',
  '4minute': '포미닛',
  'secret': '시크릿',
  'rainbow': '레인보우',
  'after school': '애프터스쿨',
  'orange caramel': '오렌지캬라멜',
  'nine muses': '나인뮤지스',
  '9muses': '나인뮤지스',
  'dalshabet': '달샤벳',
  'stellar': '스텔라',
  'spica': '스피카',
  'hellovenus': '헬로비너스',
  'fiestar': '피에스타',
  'ladies\' code': '레이디스 코드',
  'crayon pop': '크레용팝',
  'lovelyz': '러블리즈',
  'laboum': '라붐',
  'clc': '씨엘씨',
  'dia': '다이아',
  'april': '에이프릴',
  'sonamoo': '소나무',
  'gugudan': '구구단',
  'pristin': '프리스틴',
  'weki meki': '위키미키',
  'momoland': '모모랜드',
  'dreamcatcher': '드림캐쳐',
  'loona': '이달의 소녀',
  'artms': '아르테미스',
  'loossemble': '루셈블',
  'cherry bullet': '체리블렛',
  'rocket punch': '로켓펀치',
  'everglow': '에버글로우',
  'weeekly': '위클리',
  'woo!ah!': '우아',
  'purple kiss': '퍼플키스',
  'lightsum': '라잇썸',
  'billlie': '빌리',
  'kep1er': '케플러',
  'class:y': '클라씨',
  'csr': '첫사랑',
  'h1-key': '하이키',
  'h1key': '하이키',
  'limelight': '라임라잇',
  'madein': '메이딘',
  'young posse': '영파씨',
  'unis': '유니스',
  'meovv': '미야오',
  'izna': '이즈나',
  'hearts2hearts': '하츠투하츠',
  'kiiikiii': '키키',
  'rescence': '리센느',
  'rescene': '리센느',
  'say my name': '세이마이네임',
  'high4': '하이포',
  'rothy': '로시',
  'cheeze': '치즈',
  'stella jang': '스텔라장',
  'oohyo': '우효',
  'sunwoo jung-a': '선우정아',
  'sunwoojunga': '선우정아',

  // K-Pop Soloists & Korean Singers
  'lilas': '리라',
  'ikuta lilas': '이쿠타 리라',
  'lilas ikuta': '이쿠타 리라',
  'crush': '크러쉬',
  'heize': '헤이즈',
  'taeyeon': '태연',
  'baekhyun': '백현',
  'kai': '카이',
  'd.o.': '디오',
  'suho': '수호',
  'chen': '첸',
  'chanyeol': '찬열',
  'sehun': '세훈',
  'xiumin': '시우민',
  'taemin': '태민',
  'key': '키',
  'onew': '온유',
  'minho': '민호',
  'jonghyun': '종현',
  'irene': '아이린',
  'seulgi': '슬기',
  'wendy': '웬디',
  'joy': '조이',
  'yeri': '예리',
  'boa': '보아',
  'kyuhyun': '규현',
  'ryeowook': '려욱',
  'yesung': '예성',
  'heechul': '희철',
  'g-dragon': '지드래곤',
  'gdragon': '지드래곤',
  'gd': '지드래곤',
  'taeyang': '태양',
  'daesung': '대성',
  'cl': '씨엘',
  'park bom': '박봄',
  'sandara park': '산다라박',
  'dara': '산다라박',
  'psy': '싸이',
  'jay park': '박재범',
  'dean': '딘',
  'zion.t': '자이언티',
  'ziont': '자이언티',
  'loco': '로꼬',
  'gray': '그레이',
  'simon dominic': '사이먼 도미닉',
  'giriboy': '기리보이',
  'bewhy': '비와이',
  'changmo': '창모',
  'ash island': '애쉬 아일랜드',
  'leellamarz': '릴러말즈',
  'ph-1': '피에이치원',
  'sik-k': '식케이',
  'haon': '하온',
  'kid milli': '키드밀리',
  'justhis': '저스디스',
  'swings': '스윙스',
  'beenzino': '빈지노',
  'verbal jint': '버벌진트',
  'san e': '산이',
  'mad clown': '매드클라운',
  'primary': '프라이머리',
  'code kunst': '코드 쿤스트',
  'groovyroom': '그루비룸',
  'big naughty': '빅나티',
  'meenoi': '미노이',
  'wonstein': '원슈타인',
  'sokodomo': '소코도모',
  'mirani': '미란이',
  'mushvenom': '머쉬베놈',
  'paul blanco': '폴 블랑코',
  'zior park': '지올팍',
  'dpr live': '디피알 라이브',
  'dpr ian': '디피알 이안',
  'colde': '콜드',
  'george': '죠지',
  'peakboy': '픽보이',
  'woodz': '우즈',
  'cho seung youn': '조승연',
  'younha': '윤하',
  'ailee': '에일리',
  'sunmi': '선미',
  'chungha': '청하',
  'hyuna': '현아',
  'suzy': '수지',
  'baek a yeon': '백아연',
  'yerin baek': '백예린',
  'baek yerin': '백예린',
  'lee hi': '이하이',
  'leehi': '이하이',
  'lee suhyun': '이수현',
  'lee chanhyuk': '이찬혁',
  'suran': '수란',
  'hoody': '후디',
  'sole': '쏠',
  'punch': '펀치',
  'ben': '벤',
  'gummy': '거미',
  'lyn': '린',
  'baek ji young': '백지영',
  'alicia': '알리',
  'ali': '알리',
  'sohyang': '소향',
  'lena park': '박정현',
  'park jung hyun': '박정현',
  'lee sun hee': '이선희',
  'insooni': '인순이',
  'yangpa': '양파',
  'lee sora': '이소라',
  'park ki young': '박기영',
  'maya': '마야',
  'kim yuna': '김윤아',
  'hwasa': '화사',
  'solar': '솔라',
  'moonbyul': '문별',
  'wheein': '휘인',
  'hyolyn': '효린',
  'soyou': '소유',
  'jung eun ji': '정은지',
  'eunji': '정은지',
  'yuju': '유주',
  'chuu': '츄',
  'jeon somi': '전소미',
  'somi': '전소미',
  'kwon eunbi': '권은비',
  'kwon eun bi': '권은비',
  'yena': '최예나',
  'choi yena': '최예나',
  'jo yuri': '조유리',
  'lee chaeyeon': '이채연',
  'kang daniel': '강다니엘',
  'kim sejeong': '김세정',
  'sejeong': '김세정',
  'bibi': '비비',
  'lee young ji': '이영지',
  'leeyoungji': '이영지',
  'paul kim': '폴킴',
  'kim min seok': '김민석',
  'lee mujin': '이무진',
  'lee seung yoon': '이승윤',
  'ha hyun sang': '하현상',
  'kwon jin ah': '권진아',
  'sam kim': '샘김',
  'jung seung hwan': '정승환',
  'woody': '우디',
  'kyoungseo': '경서',
  'gyubin': '규빈',
  'bumjin': '범진',
  'hwang karam': '황가람',
  'parc jae jung': '박재정',
  'park jae jung': '박재정',
  'lim jae hyun': '임재현',
  'shin yong jae': '신용재',
  'huh gak': '허각',
  'john park': '존박',
  'eddy kim': '에디킴',
  'roy kim': '로이킴',
  'k.will': '케이윌',
  'kwill': '케이윌',
  'sung si kyung': '성시경',
  'sung si-kyung': '성시경',
  'park hyo shin': '박효신',
  'park hyo-shin': '박효신',
  'kim bum soo': '김범수',
  'kim bum-soo': '김범수',
  'naul': '나얼',
  'jung yup': '정엽',
  'yoon jong shin': '윤종신',
  'kim yeon woo': '김연우',
  'kim dong ryul': '김동률',
  'lee juck': '이적',
  'yoo hee yeol': '유희열',
  'lee seung hwan': '이승환',
  'lee seung chul': '이승철',
  'shin seung hun': '신승훈',
  'kim gun mo': '김건모',
  'seo taiji': '서태지',
  'seo taiji and boys': '서태지와 아이들',
  'lee moon sae': '이문세',
  'cho yong pil': '조용필',
  'kim kwang seok': '김광석',
  'yoo jae ha': '유재하',
  'kim hyun sik': '김현식',
  'yim jae beom': '임재범',
  'lim jae beum': '임재범',
  'park wan kyu': '박완규',
  'kim kyung ho': '김경호',
  'yoon do hyun': '윤도현',
  'min kyung hoon': '민경훈',
  'isu': '이수',
  'lee soo': '이수',
  'teI': '테이',
  'tei': '테이',
  'position': '포지션',
  'jo sung mo': '조성모',
  'im chang jung': '임창정',
  'lim chang jung': '임창정',
  'kim jong kook': '김종국',
  'wheesung': '휘성',
  'se7en': '세븐',
  'rain': '비',
  'lee hyori': '이효리',
  'uhm jung hwa': '엄정화',
  'wax': '왁스',
  'izi': '이지',
  'yarn': '얀',
  'flower': '플라워',
  'k2': '케이투',
  'emerald castle': '에메랄드 캐슬',
  'bank': '뱅크',
  'pinocchio': '피노키오',
  'k2 kim sung myun': '김성면',
  'lim young woong': '임영웅',
  'young tak': '영탁',
  'lee chan won': '이찬원',
  'jang minho': '장민호',
  'jeong dong won': '정동원',
  'kim ho joong': '김호중',
  'song ga in': '송가인',
  'hong jin young': '홍진영',
  'jang yoon jung': '장윤정',
  'jungkook': '정국',
  'jung kook': '정국',
  'jimin': '지민',
  'v': '뷔',
  'suga': '슈가',
  'agust d': '어거스트 디',
  'rm': '알엠',
  'j-hope': '제이홉',
  'jhope': '제이홉',
  'jin': '진',
  'jennie': '제니',
  'rosé': '로제',
  'rose': '로제',
  'lisa': '리사',
  'jisoo': '지수',
  'yeonjun': '연준',
  'soobin': '수빈',
  'beomgyu': '범규',
  'taehyun': '태현',
  'hueningkai': '휴닝카이',
  'young k': '영케이',
  'wonpil': '원필',
  'dowoon': '도운',
  'sungjin': '성진',
  'eaj': '제이',
  'cha eun woo': '차은우',
  'lee changsub': '이창섭',
  'changsub': '이창섭',
  'seo eunkwang': '서은광',
  'lim hyunsik': '임현식',
};

/**
 * Korean Artist Extra Aliases (abbreviations, alternate Korean spellings, real names)
 */
export const KOREAN_ARTISTS_EXTRA_ALIASES = {
  '마룬 5': ['Maroon 5', '마룬파이브', '마룬 파이브'],
  '방탄소년단': ['BTS', '방탄', '비티에스'],
  '블랙핑크': ['BLACKPINK', '블핑'],
  '소녀시대': ['SNSD', "Girls' Generation", '소시'],
  '투모로우바이투게더': ['TXT', 'TOMORROW X TOGETHER', '투바투', '티엑스티'],
  '스트레이 키즈': ['Stray Kids', '스트레이키즈', '스키즈'],
  '제로베이스원': ['ZEROBASEONE', 'ZB1', '제베원'],
  '보이넥스트도어': ['BOYNEXTDOOR', '보넥도'],
  '르세라핌': ['LE SSERAFIM', 'lesserafim'],
  '(여자)아이들': ['(G)I-DLE', '여자아이들', '아이들', 'GIDLE'],
  '악뮤': ['AKMU', '악동뮤지션', 'Akdong Musician'],
  '볼빨간사춘기': ['BOL4', '볼사', '볼빨간 사춘기'],
  '데이식스': ['DAY6', '데이6'],
  '큐더블유이알': ['QWER'],
  '십센치': ['10CM', '10cm', '10센치', '권정열'],
  '엠씨더맥스': ['M.C the MAX', 'M.C. the MAX', 'MC the MAX', '엠씨 더 맥스'],
  '에스지워너비': ['SG Wannabe', 'SG워너비', 'SG 워너비'],
  '브이오에스': ['V.O.S', 'VOS'],
  '카더가든': ['Car, the garden', 'Car the garden', '카 더 가든'],
  '검정치마': ['The Black Skirts', '검정 치마'],
  '새소년': ['SE SO NEON', '새 소년'],
  '웨이브 투 어스': ['wave to earth', '웨이브투어스'],
  '엑스디너리 히어로즈': ['Xdinary Heroes', '엑스디너리히어로즈', '엑디즈'],
  '동방신기': ['TVXQ!', 'TVXQ'],
  '슈퍼주니어': ['Super Junior', '슈주'],
  '브라운아이드걸스': ['Brown Eyed Girls', '브아걸'],
  '브라운아이드소울': ['Brown Eyed Soul', '브아솔'],
  '에프티아일랜드': ['FTISLAND', 'FT아일랜드'],
  '프로미스나인': ['fromis_9', '프로미스9', '프미나'],
  '아이오아이': ['I.O.I', 'IOI'],
  '아이즈원': ['IZ*ONE', 'IZONE'],
  '이달의 소녀': ['LOONA', '이달소'],
  '키스오브라이프': ['KISS OF LIFE', '키스 오브 라이프', '키오프'],
  '베이비몬스터': ['BABYMONSTER', '베몬'],
  '피프티피프티': ['FIFTY FIFTY', '피프티 피프티'],
  '트리플에스': ['tripleS'],
  '윤도현밴드': ['YB', '윤도현 밴드', '윤도현'],
  '버스커 버스커': ['Busker Busker', '버스커버스커'],
  '다이나믹 듀오': ['Dynamic Duo', '다이나믹듀오', '다듀'],
  '서태지와 아이들': ['Seo Taiji and Boys', '서태지와아이들'],
  '아이유': ['IU', '이지은'],
  '지드래곤': ['G-DRAGON', 'GD', '지디', '권지용'],
  '지코': ['ZICO', '우지호'],
  '정국': ['Jung Kook', 'Jungkook', '전정국'],
  '뷔': ['V', '김태형'],
  '슈가': ['SUGA', 'Agust D', '민윤기'],
  '알엠': ['RM', '김남준'],
  '제이홉': ['j-hope', '정호석'],
  '최예나': ['YENA', '예나'],
  '권은비': ['Kwon Eunbi', '은비'],
  '전소미': ['Jeon Somi', 'SOMI', '소미'],
  '산다라박': ['Sandara Park', 'Dara', '다라'],
  '케이윌': ['K.Will', 'Kwill'],
  '박정현': ['Lena Park'],
};


/**
 * Curated Global Songs Map (Official Korean Titles & Popular Pop Hits)
 */
export const GLOBAL_SONGS_MAP = {
  // Western Pop Hits
  'shape of you': '쉐이프 오브 유',
  'blinding lights': '블라인딩 라이츠',
  'anti-hero': '안티히어로',
  'anti hero': '안티히어로',
  'uptown funk': '업타운 펑크',
  'sugar': '슈가',
  'rolling in the deep': '롤링 인 더 딥',
  'bohemian rhapsody': '보헤미안 랩소디',
  'viva la vida': '비바 라 비다',
  'bad guy': '배드 가이',
  'peaches': '피치스',
  'stay': '스테이',
  'closer': '클로저',
  'something just like this': '썸씽 저스트 라이크 디스',
  'believer': '빌리버',
  'thunder': '썬더',
  'bones': '본즈',
  'chandelier': '샹들리에',
  'unstoppable': '언스토퍼블',
  'snowman': '스노우맨',
  '7 rings': '세븐 링스',
  'thank u, next': '땡큐 넥스트',
  'levitating': '레비테이팅',
  'don\'t start now': '돈 스타트 나우',
  'as it was': '애즈 잇 워즈',
  'watermelon sugar': '워터멜론 슈가',
  'good 4 u': '굿 포 유',
  'drivers license': '드라이버즈 라이선스',
  'vampire': '뱀파이어',
  'espresso': '에스프레소',
  'cruel summer': '크루얼 서머',
  'shake it off': '셰이크 잇 오프',
  'blank space': '블랭크 스페이스',
  'love story': '러브 스토리',
  'you belong with me': '유 빌롱 위드 미',
  '24k magic': '24K 매직',
  'treasure': '트레저',
  'just the way you are': '저스트 더 웨이 유 아',
  'marry you': '메리 유',
  'die with a smile': '다이 위드 어 스마일',
  'apt.': '아파트',
  'apt': '아파트',
  'attention': '어텐션',
  'we don\'t talk anymore': '위 돈 토크 애니모어',
  'dangerously': '데인저러슬리',
  'left and right': '레프트 앤 라이트',
  'see you again': '씨 유 어게인',
  'thinking out loud': '씽킹 아웃 라우드',
  'perfect': '퍼펙트',
  'bad habits': '배드 해빗츠',
  'shivers': '쉬버스',
  'sunflower': '선플라워',
  'circles': '서클즈',
  'starboy': '스타보이',
  'save your tears': '세이브 유어 티어스',
  'die for you': '다이 포 유',
  'don\'t look back in anger': '돈 룩 백 인 앵거',
  'wonderwall': '원더월',
  'let it be': '렛 잇 비',
  'hey jude': '헤이 주드',
  'yesterday': '예스터데이',
  'don\'t stop me now': '돈 스톱 미 나우',
  'we will rock you': '위 윌 록 유',
  'we are the champions': '위 아 더 챔피언스',
  'paris in the rain': '패리스 인 더 레인',
  'steal the show': '스틸 더 쇼',
  'comethru': '컴쓰루',
  '2002': '2002',

  // IU (아이유)
  'good day': '좋은 날',
  'you & i': '너랑 나',
  'you and i': '너랑 나',
  'through the night': '밤편지',
  'palette': '팔레트',
  'bbibbi': '삐삐',
  'blueming': '블루밍',
  'eight': '에잇',
  'celebrity': '셀러브리티',
  'lilac': '라일락',
  'strawberry moon': '스트로베리 문',
  'winter sleep': '겨울잠',
  'love wins all': '러브 윈즈 올',
  'holssi': '홀씨',
  'shopper': '쇼퍼',
  'twenty-three': '스물셋',
  'friday': '금요일에 만나요',
  'meaning of you': '너의 의미',
  'my sea': '아이와 나의 바다',
  'hold my hand': '내 손을 잡아',
  'knees': '무릎',
  'leon': '레옹',
  'ending scene': '이런 엔딩',
  'above the time': '시간의 바깥',
  'love poem': '러브 포엠',
  'not spring, love, or cherry blossoms': '봄 사랑 벚꽃 말고',
  'nagging': '잔소리',
  'peach': '복숭아',
  'secret garden': '비밀의 화원',
  'red shoes': '분홍신',
  'the red shoes': '분홍신',
  'dlwlrma': '이지금',

  // DAY6 (데이식스) & Bands (QWER, Jannabi, LUCY, N.Flying)
  'you were beautiful': '예뻤어',
  'time of our life': '한 페이지가 될 수 있게',
  'zombie': '좀비',
  'welcome to the show': '웰컴 투 더 쇼',
  'happy': '해피',
  'melt down': '녹아내려요',
  'congratulations': '콩그레츄레이션스',
  'letting go': '놓아 놓아 놓아',
  'i wait': '아 왜',
  'shoot me': '슛 미',
  'days gone by': '행복했던 날들이었다',
  'sweet chaos': '스위트 카오스',
  'love me or leave me': '러브 미 오어 리브 미',
  'healer': '힐러',
  'man in a movie': '맨 인 어 무비',
  't.b.h': '고민중독',
  'tbh': '고민중독',
  'my name is malguem': '내 이름 맑음',
  'discord': '디스코드',
  'harmony of stars': '별의 하모니',
  'fake idol': '가짜 아이돌',
  'for lovers who hesitate': '주저하는 연인들을 위해',
  'rooftop': '옥탑방',
  'flowering': '개화',

  // NewJeans (뉴진스)
  'hype boy': '하입보이',
  'hypeboy': '하입보이',
  'cookie': '쿠키',
  'hurt': '허트',
  'ditto': '디토',
  'omg': '오엠지',
  'super shy': '슈퍼 샤이',
  'eta': '이티에이',
  'cool with you': '쿨 위드 유',
  'new jeans': '뉴진스',
  'asap': '에이셉',
  'how sweet': '하우 스위트',
  'bubble gum': '버블 검',
  'supernatural': '슈퍼내추럴',
  'right now': '라이트 나우',

  // aespa (에스파)
  'black mamba': '블랙맘바',
  'next level': '넥스트 레벨',
  'savage': '새비지',
  'dreams come true': '드림스 컴 트루',
  'girls': '걸스',
  'illusion': '도깨비불',
  'spicy': '스파이시',
  'thirsty': '써스티',
  'drama': '드라마',
  'supernova': '슈퍼노바',
  'armageddon': '아마겟돈',
  'whiplash': '위플래시',
  'up': '업',

  // IVE (아이브)
  'eleven': '일레븐',
  'love dive': '러브 다이브',
  'lovedive': '러브 다이브',
  'after like': '애프터 라이크',
  'kitsch': '키치',
  'i am': '아이엠',
  'either way': '이더 웨이',
  'off the record': '오프 더 레코드',
  'baddie': '배디',
  'heya': '해야',
  'accendio': '아센디오',
  'rebel heart': '레블 하트',

  // LE SSERAFIM (르세라핌)
  'fearless': '피어리스',
  'blue flame': '블루 플레임',
  'sour grapes': '사워 그레이프스',
  'antifragile': '안티프래자일',
  'impurities': '임퓨리티즈',
  'unforgiven': '언포기븐',
  'eve, psyche & the bluebeard\'s wife': '이브 프시케 그리고 푸른 수염의 아내',
  'perfect night': '퍼펙트 나이트',
  'easy': '이지',
  'smart': '스마트',
  'crazy': '크레이지',

  // (G)I-DLE ((여자)아이들)
  'latata': '라타타',
  'hann (alone)': '한',
  'hwaa': '화',
  'tomboy': '톰보이',
  'nxde': '누드',
  'queencard': '퀸카',
  'allergy': '알러지',
  'super lady': '슈퍼 레이디',
  'fate': '나는 아픈 건 딱 질색이니까',
  'klaxon': '클락션',
  'dumdi dumdi': '덤디덤디',
  'oh my god': '오 마이 갓',

  // BTS (방탄소년단)
  'boy in luv': '상남자',
  'i need u': '아이 니드 유',
  'dope': '쩔어',
  'fire': '불타오르네',
  'save me': '세이브 미',
  'blood sweat & tears': '피 땀 눈물',
  'spring day': '봄날',
  'dna': '디엔에이',
  'mic drop': '마이크 드롭',
  'fake love': '페이크 러브',
  'boy with luv': '작은 것들을 위한 시',
  'dynamite': '다이너마이트',
  'life goes on': '라이프 고즈 온',
  'butter': '버터',
  'permission to dance': '퍼미션 투 댄스',
  'yet to come': '옛 투 컴',
  'seven': '세븐',
  'standing next to you': '스탠딩 넥스트 투 유',
  'like crazy': '라이크 크레이지',

  // BLACKPINK (블랙핑크)
  'whistle': '휘파람',
  'boombayah': '붐바야',
  'playing with fire': '불장난',
  'as if it\'s your last': '마지막처럼',
  'ddu-du ddu-du': '뚜두뚜두',
  'forever young': '포에버 영',
  'kill this love': '킬 디스 러브',
  'how you like that': '하우 유 라이크 댓',
  'lovesick girls': '러브식 걸즈',
  'pink venom': '핑크 베놈',
  'shut down': '셧 다운',
  'solo': '솔로',
  'you & me': '유 앤 미',
  'on the ground': '온 더 그라운드',
  'gone': '곤',
  'flower': '꽃',

  // TWICE (트와이스)
  'like ooh-ahh': '우아하게',
  'cheer up': '치어업',
  'cheerup': '치어업',
  'tt': '티티',
  'knock knock': '낙낙',
  'signal': '시그널',
  'likey': '라이키',
  'heart shaker': '하트 셰이커',
  'what is love?': '왓 이즈 러브',
  'dance the night away': '댄스 더 나이트 어웨이',
  'yes or yes': '예스 오어 예스',
  'fancy': '팬시',
  'feel special': '필 스페셜',
  'more & more': '모어 앤 모어',
  'i can\'t stop me': '아이 캔트 스톱 미',
  'alcohol-free': '알콜-프리',
  'the feels': '더 필즈',
  'talk that talk': '톡댓톡',

  // Red Velvet (레드벨벳)
  'happiness': '행복',
  'ice cream cake': '아이스크림 케이크',
  'dumb dumb': '덤덤',
  'russian roulette': '러시안 룰렛',
  'rookie': '루키',
  'red flavor': '빨간 맛',
  'peek-a-boo': '피카부',
  'bad boy': '배드 보이',
  'power up': '파워 업',
  'umpah umpah': '음파음파',
  'psycho': '사이코',
  'queendom': '퀸덤',
  'feel my rhythm': '필 마이 리듬',
  'chill kill': '칠 킬',
  'cosmic': '코스믹',

  // SEVENTEEN (세븐틴)
  'very nice': '아주 NICE',
  'ajunice': '아주 NICE',
  'don\'t wanna cry': '울고 싶지 않아',
  'clap': '박수',
  'oh my!': '어쩌나',
  'left & right': '레프트 앤 라이트',
  'ready to love': '레디 투 러브',
  'rock with you': '락 위드 유',
  'hot': '핫',
  '_world': '월드',
  'super': '손오공',
  'god of music': '음악의 신',
  'maestro': '마에스트로',
  'fighting': '파이팅 해야지',
  'pretty u': '예쁘다',
  'mansae': '만세',
  'adore u': '아낀다',

  // GFRIEND (여자친구)
  'glass bead': '유리구슬',
  'me gustas tu': '오늘부터 우리는',
  'rough': '시간을 달려서',
  'navillera': '너 그리고 나',
  'fingertip': '핑거팁',
  'love whisper': '귀를 기울이면',
  'time for the moon night': '밤',
  'sunrise': '해야',
  'crossroads': '교차로',
  'mago': '마고',

  // SNSD / Taeyeon (소녀시대 / 태연)
  'into the new world': '다시 만난 세계',
  'gee': '지',
  'genie': '소원을 말해봐',
  'oh!': '오',
  'run devil run': '런 데빌 런',
  'hoot': '훗',
  'the boys': '더 보이즈',
  'i got a boy': '아이 갓 어 보이',
  'mr.mr.': '미스터미스터',
  'lion heart': '라이언 하트',
  'forever 1': '포에버 원',
  'if': '만약에',
  'can you hear me': '들리나요',
  'four seasons': '사계',
  'weekend': '위크엔드',
  'invu': '아이앤비유',
  'to. x': '투 엑스',

  // Other K-Pop / Korean Hits
  'plot twist': '첫 만남은 계획대로 되지 않아',
  'if i\'m s, can you be my n?': '내가 S면 넌 나의 N이 되어줘',
  'magnetic': '마그네틱',
  'get a guitar': '겟 어 기타',
  'love 119': '러브 119',
  'boom boom bass': '붐 붐 베이스',
  'siren': '사이렌',
  'impossible': '임파서블',
  'earth, wind & fire': '어스 윈드 앤 파이어',
  'sticky': '스티키',
  'midas touch': '마이다스 터치',
  'sheesh': '쉬시',
  'drip': '드립',
  'wannabe': '워너비',
  'dalla dalla': '달라달라',
  'sneakers': '스니커즈',
  'teddy bear': '테디베어',
  'bubble': '버블',
  'love me like this': '러브 미 라이크 디스',
  'dash': '대시',
  'see that?': '별별별',
  'rollin\'': '롤린',
  'rollin': '롤린',
  'we ride': '운전만해',
  'chi mat ba ram': '치맛바람',
  'nonstop': '살짝 설렜어',
  'dolphin': '돌핀',
  'dun dun dance': '던던댄스',
  'fifth season': '다섯 번째 계절',
  'dm': '디엠',
  'supersonic': '슈퍼소닉',
  'we go': '위고',
  'love bomb': '러브 밤',
  'la vie en rose': '라비앙로즈',
  'violeta': '비올레타',
  'fiesta': '피에스타',
  'secret story of the swan': '환상동화',
  'panorama': '파노라마',
  'energetic': '에너제틱',
  'love scenario': '사랑을 했다',
  'really really': '릴리 릴리',
  'empty': '공허해',
  'haru haru': '하루하루',
  'fantastic baby': '판타스틱 베이비',
  'bang bang bang': '뱅뱅뱅',
  'loser': '루저',
  'if you': '이프 유',
  'last dance': '라스트 댄스',
  'flower road': '꽃길',
  'still life': '봄여름가을겨울',
  'eyes, nose, lips': '눈, 코, 입',
  'crooked': '삐딱하게',
  'untitled, 2014': '무제',
  'home sweet home': '홈 스위트 홈',
  'i am the best': '내가 제일 잘 나가',
  'missing you': '그리워하다',
  'only one for me': '너 없인 안 된다',
  'beautiful pain': '아름답고도 아프구나',
  'some': '썸',
  'travel': '여행',
  'to my youth': '나의 사춘기에게',
  'how can i love the heartbreak, you\'re the one i love': '어떻게 이별까지 사랑하겠어, 널 사랑하는 거지',
  '200%': '이백퍼센트',
  'give love': '기브 러브',
  'long day, long night': '오랜 날 오랜 밤',
  'dinosaur': '다이노소어',
  'love lee': '러브 리',
  'fry\'s dream': '후라이의 꿈',
  'event horizon': '사건의 지평선',
  'waiting': '기다리다',
  'password 486': '비밀번호 486',
  'umbrella': '우산',
  'comet': '혜성',
  'ootd': '오오티디',
  'traffic light': '신호등',
  'episode': '에피소드',
  'every day, every moment': '모든 날, 모든 순간',
  'me after you': '너를 만나',
  'gift': '선물',
  'love, maybe': '사랑인가 봐',
  'you, clouds, rain': '비도 오고 그래서',
  'happen': '헤픈 우연',
  'any song': '아무노래',
  'new thing': '새삥',
  'spot!': '스팟',
  'cherry blossom ending': '벚꽃 엔딩',
  'wild flower': '야생화',
  'snowflower': '눈의 꽃',
  'every moment of you': '너의 모든 순간',
  'two people': '두 사람',
  'on the street': '거리에서',
  'tell me': '텔미',
  'growl': '으르렁',
  'lies': '거짓말',
  'all for you': '애상',
  'one candle': '촛불하나',
  'running in the sky': '하늘을 달리다',
  'thorn': '가시',
  'lalala': '라라라',
  'gangnam style': '강남스타일',
};

// Build reverse lookup index for bidirectional matching
const REVERSE_INDEX = new Map();

function registerSynonymGroup(synonyms) {
  const cleanSyns = [...new Set(synonyms.filter(s => typeof s === 'string' && s.trim().length > 0).map(s => s.trim()))];
  if (cleanSyns.length === 0) return;

  for (const syn of cleanSyns) {
    const norm = syn.toLowerCase();
    const stripped = norm.replace(/[\p{P}\p{Z}\s]/gu, '');
    const keys = [norm];
    if (stripped.length >= 2 && stripped !== norm) {
      keys.push(stripped);
    }
    for (const k of keys) {
      let set = REVERSE_INDEX.get(k);
      if (!set) {
        set = new Set();
        REVERSE_INDEX.set(k, set);
      }
      for (const other of cleanSyns) {
        set.add(other);
      }
    }
  }
}

// 1. Populate from JAPANESE_DICTIONARY (with Korean phonetic variants for Hangul aliases)
for (const [key, aliases] of Object.entries(JAPANESE_DICTIONARY)) {
  const expanded = [key, ...aliases];
  for (const a of aliases) {
    if (/[가-힣]/.test(a) && a.length <= 12) {
      for (const kv of expandJapaneseKoreanVariants(a)) {
        expanded.push(kv);
      }
    }
  }
  registerSynonymGroup(expanded);
}

// 2. Populate from JAPANESE_PERSON_ARTISTS (full names in Kanji, Korean variants, Romaji orders)
for (const person of JAPANESE_PERSON_ARTISTS) {
  const kanjiFull = person.kanji.join('');
  const kanjiSpace = person.kanji.join(' ');
  const korFullSpace = person.korean.join(' ');
  const korFullNoSpace = person.korean.join('');
  const romaji1 = person.romaji.join(' ');
  const romaji2 = [person.romaji[1], person.romaji[0]].join(' ');
  const korVariants = expandJapaneseKoreanVariants(korFullSpace);

  const group = [
    kanjiFull,
    kanjiSpace,
    korFullSpace,
    korFullNoSpace,
    romaji1,
    romaji2,
    ...korVariants,
  ];
  registerSynonymGroup(group);
}

// 3. Group GLOBAL_ARTISTS_MAP by Korean name and merge with KOREAN_ARTISTS_EXTRA_ALIASES
const artistGroupsByKo = new Map();
for (const [eng, kor] of Object.entries(GLOBAL_ARTISTS_MAP)) {
  if (!artistGroupsByKo.has(kor)) {
    artistGroupsByKo.set(kor, new Set([kor]));
  }
  artistGroupsByKo.get(kor).add(eng);
}
for (const [kor, extraAliases] of Object.entries(KOREAN_ARTISTS_EXTRA_ALIASES)) {
  if (!artistGroupsByKo.has(kor)) {
    artistGroupsByKo.set(kor, new Set([kor]));
  }
  const group = artistGroupsByKo.get(kor);
  for (const alias of extraAliases) {
    group.add(alias);
    if (artistGroupsByKo.has(alias)) {
      for (const sub of artistGroupsByKo.get(alias)) {
        group.add(sub);
      }
    }
  }
}
for (const groupSet of artistGroupsByKo.values()) {
  registerSynonymGroup([...groupSet]);
}

// 4. Populate from GLOBAL_SONGS_MAP
const songGroupsByKo = new Map();
for (const [eng, kor] of Object.entries(GLOBAL_SONGS_MAP)) {
  if (!songGroupsByKo.has(kor)) {
    songGroupsByKo.set(kor, new Set([kor]));
  }
  songGroupsByKo.get(kor).add(eng);
}
for (const groupSet of songGroupsByKo.values()) {
  registerSynonymGroup([...groupSet]);
}

/**
 * Returns all Japanese/Global transliterated variants (Korean pronunciation, Romaji, etc.)
 */
export function getJapaneseVariants(input: string): string[] {
  if (!input || typeof input !== 'string') return [];
  const text = input.trim();
  if (!text) return [];

  const results = new Set();

  // 1. Exact & normalized reverse lookup in dictionary
  const normKey = text.toLowerCase();
  const strippedKey = normKey.replace(/[\p{P}\p{Z}\s]/gu, '');
  if (REVERSE_INDEX.has(normKey)) {
    for (const item of REVERSE_INDEX.get(normKey)) {
      results.add(item);
    }
  }
  if (strippedKey.length >= 2 && REVERSE_INDEX.has(strippedKey)) {
    for (const item of REVERSE_INDEX.get(strippedKey)) {
      results.add(item);
    }
  }

  // 2. If input is Korean, also check Japanese Korean phonetic variants in REVERSE_INDEX
  if (/[가-힣]/.test(text) && text.length <= 12) {
    for (const kv of expandJapaneseKoreanVariants(text)) {
      const kvNorm = kv.toLowerCase();
      const kvStripped = kvNorm.replace(/[\p{P}\p{Z}\s]/gu, '');
      if (REVERSE_INDEX.has(kvNorm)) {
        for (const item of REVERSE_INDEX.get(kvNorm)) results.add(item);
      }
      if (kvStripped.length >= 2 && REVERSE_INDEX.has(kvStripped)) {
        for (const item of REVERSE_INDEX.get(kvStripped)) results.add(item);
      }
    }
  }

  // 3. Substring dictionary search (for compounds like 'Cheerful Vibes Echo (音乃瀬奏 SOLO)')
  for (const [key, aliases] of Object.entries(JAPANESE_DICTIONARY)) {
    if (text.includes(key) && key.length >= 2) {
      for (const a of aliases) results.add(a);
    }
  }
  for (const person of JAPANESE_PERSON_ARTISTS) {
    const kanjiFull = person.kanji.join('');
    if (text.includes(kanjiFull) && kanjiFull.length >= 2) {
      const korFullSpace = person.korean.join(' ');
      results.add(korFullSpace);
      results.add(person.korean.join(''));
      results.add(person.romaji.join(' '));
      for (const kv of expandJapaneseKoreanVariants(korFullSpace)) {
        results.add(kv);
      }
    }
  }

const KATAKANA_LOANWORD_REPLACEMENTS = [
  ['포루타', '폴터'],
  ['포루', '폴'],
  ['부루', '블루'],
  ['쿠루', '클루'],
  ['푸루', '플루'],
  ['구루', '글루'],
  ['구리', '그리'],
  ['푸리', '프리'],
  ['쿠리', '크리'],
  ['부리', '브리'],
  ['도리', '드리'],
  ['토리', '트리'],
  ['부라', '블랙'],
  ['쿠라', '클래'],
  ['푸라', '플래'],
  ['스카토', '스커트'],
  ['스타토', '스타트'],
  ['하토', '하트'],
  ['파토', '파트'],
  ['라이토', '라이트'],
  ['나이토', '나이트'],
  ['화이토', '화이트'],
  ['스위토', '스위트'],
  ['포인토', '포인트'],
  ['이벤토', '이벤트'],
  ['프레젠토', '프레젠트'],
  ['콘사토', '콘서트'],
  ['로보토', '로봇'],
  ['포켓토', '포켓'],
  ['티켓토', '티켓'],
  ['로켓토', '로켓'],
  ['스피도', '스피드'],
  ['사운도', '사운드'],
  ['그라운도', '그라운드'],
  ['라운도', '라운드'],
  ['와루도', '월드'],
  ['고루도', '골드'],
  ['호루도', '홀드'],
  ['코루도', '콜드'],
  ['오루도', '올드'],
  ['필도', '필드'],
  ['실도', '실드'],
  ['마인도', '마인드'],
  ['윈도', '윈드'],
  ['위켄도', '위크엔드'],
  ['레전도', '레전드'],
  ['다이아몬도', '다이아몬드'],
  ['원더랜도', '원더랜드'],
  ['아일랜도', '아일랜드'],
  ['타이무', '타임'],
  ['게무', '게임'],
  ['네무', '네임'],
  ['프레이무', '프레임'],
  ['도리무', '드림'],
  ['크리무', '크림'],
  ['티무', '팀'],
  ['비무', '빔'],
  ['호무', '홈'],
  ['루무', '룸'],
  ['부무', '붐'],
  ['즈무', '줌'],
  ['시스테무', '시스템'],
  ['아루바무', '앨범'],
  ['리드무', '리듬'],
  ['프리즘', '프리즘'],
  ['폿푸스', '팝스'],
  ['폿푸', '팝'],
  ['스톳푸', '스톱'],
  ['스텟푸', '스텝'],
  ['점푸', '점프'],
  ['캠푸', '캠프'],
  ['램푸', '램프'],
  ['루푸', '루프'],
  ['수푸', '수프'],
  ['그룹푸', '그룹'],
  ['샤푸', '샤프'],
  ['타이프', '타이프'],
  ['테푸', '테이프'],
  ['라부', '러브'],
  ['라이부', '라이브'],
  ['드라이부', '드라이브'],
  ['웨이부', '웨이브'],
  ['세이부', '세이브'],
  ['무부', '무브'],
  ['그루부', '그루브'],
  ['신규라리티', '싱귤래리티'],
  ['신규라', '싱귤래'],
  ['리콘티뉴', '리컨티뉴'],
  ['콘티뉴', '컨티뉴'],
  ['콘트롤', '컨트롤'],
  ['콘택트', '컨택트'],
  ['몬스타', '몬스터'],
  ['센타', '센터'],
  ['필타', '필터'],
  ['윈타', '윈터'],
  ['레타', '레터'],
  ['베타', '베터'],
  ['바타', '버터'],
  ['파이다', '파이터'],
  ['라이타', '라이터'],
  ['카운타', '카운터'],
  ['포스타', '포스터'],
  ['코스타', '코스터'],
  ['마스타', '마스터'],
  ['미스타', '미스터'],
  ['시스타', '시스터'],
  ['시루바', '실버'],
  ['오바', '오버'],
  ['라바', '러버'],
  ['네바', '네버'],
  ['에바', '에버'],
  ['리바', '리버'],
  ['피바', '피버'],
  ['드라이바', '드라이버'],
  ['사마', '서머'],
  ['남바', '넘버'],
  ['멤바', '멤버'],
  ['스피카', '스피커'],
  ['메이카', '메이커'],
  ['조카', '조커'],
];

function convertRuToBatchimL(korStr) {
  let out = '';
  for (let i = 0; i < korStr.length; i++) {
    if (korStr[i] === '루' && out.length > 0) {
      const prevCode = out.charCodeAt(out.length - 1);
      if (prevCode >= 0xAC00 && prevCode <= 0xD7A3 && (prevCode - 0xAC00) % 28 === 0) {
        out = out.slice(0, -1) + String.fromCharCode(prevCode + 8);
        continue;
      }
    }
    out += korStr[i];
  }
  return out;
}

function expandKatakanaLoanwordVariants(korMora) {
  if (!korMora || typeof korMora !== 'string') return [];
  const variants = new Set([korMora]);

  // 1. Apply known loanword chunk replacements
  let replaced = korMora;
  for (const [from, to] of KATAKANA_LOANWORD_REPLACEMENTS) {
    if (replaced.includes(from)) {
      replaced = replaced.split(from).join(to);
      variants.add(replaced);
    }
    if (korMora.includes(from)) {
      variants.add(korMora.split(from).join(to));
    }
  }

  // 2. Apply systematic Ru -> Batchim ㄹ and word-final To->트, Do->드, Ku->크, Pu->프, Mu->ㅁ
  for (const base of [...variants]) {
    const withL = convertRuToBatchimL(base);
    variants.add(withL);
    for (const candidate of [base, withL]) {
      let mod = candidate
        .replace(/토$/g, '트')
        .replace(/도$/g, '드')
        .replace(/쿠$/g, '크')
        .replace(/푸$/g, '프');
      if (mod.endsWith('무') && mod.length >= 2) {
        const prev = mod.charCodeAt(mod.length - 2);
        if (prev >= 0xAC00 && prev <= 0xD7A3 && (prev - 0xAC00) % 28 === 0) {
          mod = mod.slice(0, -2) + String.fromCharCode(prev + 16);
        }
      }
      variants.add(mod);
      // Vowel shift: 타->터, 카->커, 콘->컨, 라->래
      if (mod.includes('타')) variants.add(mod.replace(/타/g, '터'));
      if (mod.includes('카')) variants.add(mod.replace(/카/g, '커'));
      if (mod.includes('콘')) variants.add(mod.replace(/콘/g, '컨'));
      if (mod.includes('신규라')) {
        variants.add(mod.replace('신규라', '싱귤래'));
        variants.add(mod.replace('신규라', '싱귤라'));
      }
    }
  }

  return [...variants];
}

const JAPANESE_KANJI_PHRASE_BLOCKS = [
  ['言わない', '이와나이', '말하지 않아'],
  ['言えない', '이에나이', '말할 수 없어'],
  ['忘れない', '와스레나이', '잊지 않아'],
  ['戻れない', '모도레나이', '돌아갈 수 없어'],
  ['変わらない', '카와라나이', '변하지 않아'],
  ['終わらない', '오와라나이', '끝나지 않아'],
  ['消えない', '키에나이', '사라지지 않아'],
  ['泣かない', '나카나이', '울지 않아'],
  ['いとおしい', '이토오시이', '사랑스러운'],
  ['愛おしい', '이토오시이', '사랑스러운'],
  ['あかねさす', '아카네사스', '노을빛 비치는'],
  ['茜さす', '아카네사스', '노을빛 비치는'],
  ['さよなら', '사요나라', '안녕'],
  ['サヨナラ', '사요나라', '안녕'],
  ['キライ', '키라이', '싫어함'],
  ['嫌い', '키라이', '싫어함'],
  ['スキ', '스키', '좋아함'],
  ['好き', '스키', '좋아함'],
  ['のち', '노치', '뒤'],
  ['日々', '히비', '나날'],
  ['暮らし', '쿠라시', '삶'],
  ['結び', '무스비', '매듭'],
  ['千鳥', '치도리', '물떼새'],
  ['夜鷹', '요다카', '쏙독새'],
  ['乗る', '노루', '타다'],
  ['護る', '마모루', '지키다'],
  ['守る', '마모루', '지키다'],
  ['風', '카제', '바람'],
  ['灯', '히', '등불'],
  ['頃', '코로', '무렵'],
  ['烏', '카라스', '까마귀'],
  ['零', '제로', '영'],
];

function convertJapaneseMixedText(text) {
  const results = new Set();
  let pronStr = text;
  let transStr = text;
  let matchedBlock = false;

  for (const [jp, readingKo, meaningKo] of JAPANESE_KANJI_PHRASE_BLOCKS) {
    if (pronStr.includes(jp)) {
      matchedBlock = true;
      pronStr = pronStr.split(jp).join(` ${readingKo} `);
      transStr = transStr.split(jp).join(` ${meaningKo} `);
    }
  }

  if (!matchedBlock) return [];

  // Particle handling for pronunciation & translation
  const pronWithWa = pronStr
    .replace(/は/g, '와 ')
    .replace(/へ/g, '에 ')
    .replace(/を/g, '오 ')
    .replace(/の/g, '노 ')
    .replace(/に/g, '니 ')
    .replace(/と/g, '토 ')
    .replace(/[！!？?。、・]/g, ' ');

  const { korean: remKor } = kanaToRomajiAndKorean(pronWithWa);
  const cleanPron = remKor.replace(/\s+/g, ' ').trim();
  if (cleanPron && !/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(cleanPron)) {
    results.add(cleanPron);
    results.add(cleanPron.replace(/\s+/g, ''));
  }

  const transClean = transStr
    .replace(/\s*は\s*/g, '은 ')
    .replace(/\s*の\s*/g, '의 ')
    .replace(/\s*に\s*/g, '에 ')
    .replace(/\s*を\s*/g, '을 ')
    .replace(/[！!？?。、・]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (transClean && !/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(transClean)) {
    results.add(transClean);
    results.add(transClean.replace(/\s+/g, ''));
  }

  return [...results];
}

  // 4. Kana algorithmic conversion if text contains Hiragana or Katakana
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) {
    const { romaji, korean, koreanVariants } = kanaToRomajiAndKorean(text);
    if (romaji && romaji !== text) results.add(romaji);
    const korList = Array.isArray(koreanVariants) && koreanVariants.length > 0 ? koreanVariants : (korean ? [korean] : []);
    const hasKatakana = /[\u30A0-\u30FF]/.test(text);
    for (const korItem of korList) {
      if (korItem && korItem !== text) {
        results.add(korItem);
        for (const kv of expandJapaneseKoreanVariants(korItem)) {
          results.add(kv);
        }
        if (hasKatakana) {
          for (const lv of expandKatakanaLoanwordVariants(korItem)) {
            results.add(lv);
          }
        }
      }
    }
  }

  // 5. Mixed Kanji/Kana phrase conversion
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) {
    for (const mixedVar of convertJapaneseMixedText(text)) {
      results.add(mixedVar);
    }
  }

  return [...results];
}

/**
 * Common English Song Words to Korean Hangul Phonetic Map
 */
export const ENGLISH_WORDS_KO_MAP = {
  // Food & drink
  'garden': ['가든'],
  'lemon': ['레몬'],
  'candy': ['캔디'],
  'sugar': ['슈가'],
  'butter': ['버터'],
  'honey': ['허니'],
  'ice': ['아이스'],
  'cream': ['크림'],
  'cherry': ['체리'],
  'apple': ['애플'],
  'banana': ['바나나'],
  'chocolate': ['초콜릿', '초코'],
  'coffee': ['커피'],
  'tea': ['티'],
  'wine': ['와인'],

  // Nature, elements, space
  'flower': ['플라워'],
  'rose': ['로즈'],
  'tree': ['트리'],
  'forest': ['포레스트'],
  'sun': ['선'],
  'moon': ['문'],
  'star': ['스타'],
  'stars': ['스타즈'],
  'sky': ['스카이'],
  'cloud': ['클라우드'],
  'rain': ['레인'],
  'snow': ['스노우', '스노'],
  'wind': ['윈드'],
  'storm': ['스톰'],
  'fire': ['파이어'],
  'water': ['워터'],
  'sea': ['씨', '시'],
  'ocean': ['오션'],
  'river': ['리버'],
  'world': ['월드'],
  'space': ['스페이스'],
  'universe': ['유니버스'],
  'galaxy': ['갤럭시'],
  'planet': ['플래닛'],

  // Colors
  'blue': ['블루'],
  'red': ['레드'],
  'green': ['그린'],
  'yellow': ['옐로우', '옐로'],
  'black': ['블랙'],
  'white': ['화이트'],
  'pink': ['핑크'],
  'gold': ['골드'],
  'silver': ['실버'],
  'purple': ['퍼플'],
  'orange': ['오렌지'],
  'gray': ['그레이'],
  'grey': ['그레이'],

  // Music, art, sound
  'music': ['뮤직'],
  'song': ['송'],
  'songs': ['송즈'],
  'sing': ['싱'],
  'dance': ['댄스'],
  'dancer': ['댄서'],
  'beat': ['비트'],
  'rhythm': ['리듬'],
  'melody': ['멜로디'],
  'voice': ['보이스'],
  'sound': ['사운드'],
  'echo': ['에코'],
  'vibe': ['바이브'],
  'vibes': ['바이브스'],
  'band': ['밴드'],
  'guitar': ['기타'],
  'piano': ['피아노'],
  'drum': ['드럼'],
  'bass': ['베이스'],
  'rock': ['록', '락'],
  'pop': ['팝'],
  'jazz': ['재즈'],
  'disco': ['디스코'],
  'stage': ['스테이지'],
  'show': ['쇼'],
  'live': ['라이브'],

  // Seasons & time
  'spring': ['스프링'],
  'summer': ['서머', '썸머'],
  'autumn': ['어텀'],
  'fall': ['폴'],
  'winter': ['윈터'],
  'day': ['데이'],
  'days': ['데이즈'],
  'night': ['나이트'],
  'nights': ['나이츠'],
  'morning': ['모닝'],
  'midnight': ['미드나이트'],
  'time': ['타임'],
  'times': ['타임즈'],
  'today': ['투데이'],
  'tomorrow': ['투모로우'],
  'yesterday': ['예스터데이'],
  'forever': ['포에버'],
  'always': ['올웨이즈'],
  'never': ['네버'],
  'again': ['어게인'],

  // Emotions & states
  'love': ['러브'],
  'lover': ['러버'],
  'heart': ['하트'],
  'hearts': ['하츠'],
  'soul': ['소울'],
  'mind': ['마인드'],
  'dream': ['드림'],
  'dreams': ['드림스'],
  'hope': ['호프'],
  'wish': ['위시'],
  'smile': ['스마일'],
  'happy': ['해피'],
  'joy': ['조이'],
  'peace': ['피스'],
  'cry': ['크라이'],
  'tear': ['티어'],
  'tears': ['티어스'],
  'sad': ['새드'],
  'pain': ['페인'],
  'lonely': ['론리'],
  'alone': ['얼론'],
  'dark': ['다크'],
  'light': ['라이트'],
  'lights': ['라이츠'],
  'shine': ['샤인'],
  'sparkle': ['스파클'],
  'sweet': ['스위트'],
  'bitter': ['비터'],
  'crazy': ['크레이지'],
  'free': ['프리'],
  'cool': ['쿨'],
  'hot': ['핫'],

  // People & characters
  'boy': ['보이'],
  'boys': ['보이즈'],
  'girl': ['걸'],
  'girls': ['걸스', '걸즈'],
  'man': ['맨'],
  'woman': ['우먼'],
  'lady': ['레이디'],
  'baby': ['베이비'],
  'friend': ['프렌드'],
  'friends': ['프렌즈'],
  'angel': ['엔젤', '엔절'],
  'devil': ['데블', '데빌'],
  'monster': ['몬스터'],
  'ghost': ['고스트'],
  'hero': ['히어로'],
  'king': ['킹'],
  'queen': ['퀸'],
  'prince': ['프린스'],
  'princess': ['프린세스'],
  'idol': ['아이돌'],
  'fighter': ['파이터'],
  'champion': ['챔피언'],

  // Concepts, nouns & actions
  'secret': ['시크릿'],
  'magic': ['매직'],
  'magical': ['매지컬'],
  'special': ['스페셜'],
  'perfect': ['퍼펙트'],
  'first': ['퍼스트'],
  'last': ['라스트'],
  'game': ['게임'],
  'play': ['플레이'],
  'story': ['스토리'],
  'sign': ['사인'],
  'memory': ['메모리'],
  'party': ['파티'],
  'city': ['시티'],
  'town': ['타운'],
  'home': ['홈'],
  'house': ['하우스'],
  'bird': ['버드'],
  'birds': ['버즈'],
  'cat': ['캣'],
  'dog': ['독'],
  'wolf': ['울프'],
  'lion': ['라이언'],
  'tiger': ['타이거'],
  'dragon': ['드래곤'],
  'diamond': ['다이아몬드'],
  'money': ['머니'],
  'glass': ['글래스'],
  'mirror': ['미러'],
  'shadow': ['섀도우', '새도우'],
  'silhouette': ['실루엣'],
  'inferno': ['인페르노'],
  'paradise': ['파라다이스'],
  'heaven': ['헤븐'],
  'dynamite': ['다이너마이트'],
  'spark': ['스파크'],
  'rainbow': ['레인보우', '레인보'],
  'crystal': ['크리스탈'],
  'one': ['원'],
  'two': ['투'],
  'three': ['쓰리'],
  'four': ['포'],
  'five': ['파이브'],
  'six': ['식스'],
  'seven': ['세븐'],
  'eight': ['에이트'],
  'nine': ['나인'],
  'ten': ['텐'],
  'run': ['런'],
  'fly': ['플라이'],
  'jump': ['점프'],
  'kiss': ['키스'],
  'touch': ['터치'],
  'call': ['콜'],
  'say': ['세이'],
  'tell': ['텔'],
  'see': ['씨', '시'],
  'look': ['룩'],
  'feel': ['필'],
  'stop': ['스톱'],
  'stay': ['스테이'],
  'start': ['스타트'],
  'end': ['엔드'],
  'railgun': ['레일건'],
  'pretender': ['프리텐더'],
  'subtitle': ['서브타이틀'],
  'mixed': ['믹스드', '믹스'],
  'nuts': ['너츠'],
  'connect': ['커넥트'],
  'escape': ['이스케이프'],
  'complex': ['콤플렉스'],
  'distortion': ['디스토션'],
  'cheerful': ['치어풀'],
  'shape': ['쉐이프', '셰이프'],
  'blinding': ['블라인딩'],
  'anti': ['안티'],
  'uptown': ['업타운'],
  'funk': ['펑크'],
  'bohemian': ['보헤미안'],
  'rhapsody': ['랩소디'],
  'supernova': ['슈퍼노바'],
  'next': ['넥스트'],
  'level': ['레벨'],
  'hype': ['하입'],
  'hello': ['헬로'],
  'goodbye': ['굿바이'],
  'sorry': ['쏘리', '소리'],
  'good': ['굿'],
  'bad': ['배드'],
  'new': ['뉴'],
  'super': ['슈퍼'],
  'ultra': ['울트라'],
  'mega': ['메가'],
  'only': ['온리'],
  'all': ['올'],
  'no': ['노'],
  'yes': ['예스'],
  'more': ['모어'],
  'and': ['앤드', '앤'],
  'the': ['더'],
  'of': ['오브'],
  'to': ['투'],
  'for': ['포'],
  'with': ['위드'],
  'you': ['유'],
  'me': ['미'],
  'my': ['마이'],
  'your': ['유어'],
  'we': ['위'],
};

// Build reverse map from Hangul to English words
const KO_WORDS_ENGLISH_MAP = new Map();
for (const [eng, kos] of Object.entries(ENGLISH_WORDS_KO_MAP)) {
  for (const ko of kos) {
    const norm = ko.toLowerCase();
    if (!KO_WORDS_ENGLISH_MAP.has(norm)) {
      KO_WORDS_ENGLISH_MAP.set(norm, new Set());
    }
    KO_WORDS_ENGLISH_MAP.get(norm).add(eng);
  }
}

/**
 * Returns Korean Hangul phonetics for English words/phrases (and vice versa)
 */
export function getEnglishTransliterations(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  const clean = text.trim();
  if (!clean) return [];

  const results = new Set();
  const lower = clean.toLowerCase();

  // 1. Direct word/phrase lookup
  if (ENGLISH_WORDS_KO_MAP[lower]) {
    for (const ko of ENGLISH_WORDS_KO_MAP[lower]) {
      results.add(ko);
    }
  }

  // 2. Multi-word phrase splitting (e.g. "Blue Bird", "Peace Sign")
  const words = lower.split(/[\s\-_]+/);
  if (words.length >= 2) {
    const allHaveMapping = words.every(w => ENGLISH_WORDS_KO_MAP[w]);
    if (allHaveMapping) {
      let combinations = [''];
      for (const w of words) {
        const koList = ENGLISH_WORDS_KO_MAP[w];
        const nextCombos = [];
        for (const current of combinations) {
          for (const ko of koList) {
            nextCombos.push(current ? `${current} ${ko}` : ko);
          }
        }
        combinations = nextCombos;
      }
      for (const combo of combinations) {
        results.add(combo);
        results.add(combo.replace(/\s+/g, ''));
      }
    }
  }

  // 3. Reverse lookup if input is Hangul
  if (/[가-힣]/.test(clean)) {
    const koNorm = lower.replace(/\s+/g, '');
    if (KO_WORDS_ENGLISH_MAP.has(koNorm)) {
      for (const eng of KO_WORDS_ENGLISH_MAP.get(koNorm)) {
        results.add(eng);
      }
    }
  }

  return [...results];
}

/**
 * Formats a song title or artist name into Korean-first display format.
 * E.g.
 * - "望月杏奈 (CV.夏川椎菜)" -> "모치즈키 안나 (CV.나츠카와 시이나)"
 * - "kessoku band" -> "결속밴드 (kessoku band)"
 * - "Garden" -> "가든 (Garden)"
 * - "YOASOBI" -> "요아소비 (YOASOBI)"
 * - "Taylor Swift" -> "테일러 스위프트 (Taylor Swift)"
 */
export function getKoreanDisplay(str: string, aliases: string[] = []): string {
  if (!str || typeof str !== 'string') return '';
  const text = str.trim();
  if (!text) return '';

  const hasHangul = /[가-힣]/.test(text);
  const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);

  // 1. If text already has Hangul and NO Japanese:
  if (hasHangul && !hasJapanese) {
    return text;
  }

  // 2. If text contains Japanese inside parentheses or compound:
  // e.g. "望月杏奈 (CV.夏川椎菜)" -> "모치즈키 안나 (CV.나츠카와 시이나)"
  // e.g. "Cheerful Vibes Echo (音乃瀬奏 SOLO)" -> "치어풀 바이브스 에코 (오토노세 카나데 SOLO)"
  if (hasJapanese && (text.includes('(') || text.includes('['))) {
    let replacedText = text;
    for (const [key, valList] of Object.entries(JAPANESE_DICTIONARY)) {
      if (replacedText.includes(key)) {
        const kor = valList.find(v => /[가-힣]/.test(v));
        if (kor) {
          replacedText = replacedText.split(key).join(kor);
        }
      }
    }
    if (replacedText !== text) {
      return replacedText;
    }
  }

  // 3. Check Dictionary lookup for full text
  // 3a. Japanese dictionary
  for (const [key, valList] of Object.entries(JAPANESE_DICTIONARY)) {
    if (key.toLowerCase() === text.toLowerCase()) {
      const kor = valList.find(v => /[가-힣]/.test(v));
      if (kor) {
        return `${kor} (${text})`;
      }
    }
  }

  // 3b. Global artists map
  const norm = text.toLowerCase();
  if (GLOBAL_ARTISTS_MAP[norm]) {
    return `${GLOBAL_ARTISTS_MAP[norm]} (${text})`;
  }

  // 3c. Global songs map
  if (GLOBAL_SONGS_MAP[norm]) {
    return `${GLOBAL_SONGS_MAP[norm]} (${text})`;
  }

  // 3d. English words transliteration
  const engTrans = getEnglishTransliterations(text);
  if (engTrans.length > 0) {
    const primaryKo = engTrans.find(k => /[가-힣]/.test(k) && k.includes(' ')) || engTrans[0];
    if (primaryKo && primaryKo.toLowerCase() !== text.toLowerCase()) {
      return `${primaryKo} (${text})`;
    }
  }

  // 4. Check aliases for Hangul
  if (Array.isArray(aliases) && aliases.length > 0) {
    const hangulAlias = aliases.find(a => typeof a === 'string' && /[가-힣]/.test(a) && a.trim() !== text);
    if (hangulAlias) {
      return `${hangulAlias.trim()} (${text})`;
    }
  }

  // 5. Algorithmic Kana transliteration
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) {
    const { korean } = kanaToRomajiAndKorean(text);
    if (korean && /[가-힣]/.test(korean) && korean !== text) {
      return `${korean} (${text})`;
    }
  }

  return text;
}

const CHO_ROMA = [
  ['g', 'k', 'c', 'gg', 'cc', 'gh', 'gu'],       // ㄱ
  ['kk', 'k', 'gg', 'c', 'cc'],                  // ㄲ
  ['n', 'nn', 'kn'],                             // ㄴ
  ['d', 't', 'dd', 'th'],                        // ㄷ
  ['tt', 't', 'dd'],                             // ㄸ
  ['r', 'l', 'll', 'rr', 'wr', 'rh', 'n'],       // ㄹ
  ['m', 'mm'],                                   // ㅁ
  ['b', 'p', 'v', 'bb', 'vv'],                   // ㅂ
  ['pp', 'p', 'bb'],                             // ㅃ
  ['s', 'sh', 'ss', 'th', 'c', 'sc', 'sch'],     // ㅅ
  ['ss', 's', 'sh', 'c'],                        // ㅆ
  [''],                                          // ㅇ
  ['j', 'z', 'ch', 'g', 'dj', 'zz', 's'],        // ㅈ
  ['jj', 'j', 'zz'],                             // ㅉ
  ['ch', 'c', 'ts', 'tch', 'cz', 't'],           // ㅊ
  ['k', 'c', 'ck', 'kh', 'ch', 'q', 'qu', 'cc'], // ㅋ
  ['t', 'tt', 'ts', 'th', 'pt'],                 // ㅌ
  ['p', 'f', 'ph', 'v', 'pp', 'ff', 'gh'],       // ㅍ
  ['h', 'f', 'wh', 'w'],                         // ㅎ
];

const JUNG_ROMA = [
  ['a', 'ah', 'ar', 'er', 'or', 'o', 'u'],                       // ㅏ
  ['ae', 'e', 'a', 'ai', 'ea'],                                  // ㅐ
  ['ya', 'yah', 'ia'],                                           // ㅑ
  ['yae', 'ye'],                                                 // ㅒ
  ['eo', 'u', 'uh', 'o', 'ou', 'ea', 'au', 'er', 'ur', 'ir', 'or', 'ar', 'our', 'a'], // ㅓ
  ['e', 'ae', 'eh', 'a', 'ai', 'ea'],                            // ㅔ
  ['yeo', 'yu', 'yuh', 'yo', 'yeu', 'yea', 'io', 'ia'],          // ㅕ
  ['ye', 'yae', 'ie'],                                           // ㅖ
  ['o', 'oh', 'ou', 'oo', 'ow', 'oa', 'au', 'aw'],               // ㅗ
  ['wa', 'wah', 'oa', 'ua'],                                     // ㅘ
  ['wae', 'we'],                                                 // ㅙ
  ['oe', 'oi', 'we', 'oy'],                                      // ㅚ
  ['yo', 'yoh', 'jou', 'jo', 'io'],                              // ㅛ
  ['u', 'oo', 'woo', 'ou', 'uu', 'ew', 'w', 'ue', 'o', 'oe'],    // ㅜ
  ['wo', 'weo', 'wuh', 'won', 'uo', 'wa', 'war', 'wor', 'wer'],  // ㅝ
  ['we', 'wae', 'ue'],                                           // ㅞ
  ['wi', 'ui', 'we', 'uy'],                                      // ㅟ
  ['yu', 'yoo', 'you', 'yuu', 'ju', 'ew', 'u', 'ue', 'eu'],      // ㅠ
  ['eu', 'u', 'e', 'i', 'oo', 'uh', 'o', ''],                    // ㅡ
  ['ui', 'eui', 'ee', 'i', 'wi'],                                // ㅢ
  ['i', 'ee', 'y', 'ea', 'ey', 'ie', 'ii', 'e', 'ui'],           // ㅣ
];

const JONG_ROMA = [
  ['', 'e', 'h'],                         // (none)
  ['k', 'g', 'c', 'ck', 'que', 'ke', 'ge', 'x'], // ㄱ
  ['kk', 'k'],                            // ㄲ
  ['ks', 'x'],                            // ㄳ
  ['n', 'nn', 'ne', 'gn', 'kn'],          // ㄴ
  ['nj'],                                 // ㄵ
  ['nh', 'n'],                            // ㄶ
  ['t', 'd', 's', 'te', 'de'],            // ㄷ
  ['l', 'r', 'll', 'rr', 'ul', 'le', 're', 'el', 'al'], // ㄹ
  ['lk', 'lg', 'k'],                      // ㄺ
  ['lm', 'm'],                            // ㄻ
  ['lb', 'l'],                            // ㄼ
  ['ls'],                                 // ㄽ
  ['lt'],                                 // ㄾ
  ['lp'],                                 // ㄿ
  ['lh', 'l'],                            // ㅀ
  ['m', 'mm', 'me', 'mb', 'mn'],          // ㅁ
  ['p', 'b', 'pe', 'be', 've', 'f', 'fe'], // ㅂ
  ['ps'],                                 // ㅄ
  ['t', 's', 'd', 'sh', 'ss', 'ce', 'se'], // ㅅ
  ['ss', 's', 't'],                       // ㅆ
  ['ng', 'n', 'nc', 'nk'],                // ㅇ
  ['t', 'j', 'ge', 'dge'],                // ㅈ
  ['t', 'ch', 'tch'],                     // ㅊ
  ['k', 'c', 'ck', 'ke'],                 // ㅋ
  ['t', 'te', 'tt'],                      // ㅌ
  ['p', 'f', 'ph', 'pe', 'fe'],           // ㅍ
  ['h', ''],                              // ㅎ
];

const SPECIAL_SYLLABLE_ROMA = {
  '이': ['lee', 'yi', 'rhee', 'rhe', 'i', 'ee', 'y', 'ea', 'ey'],
  '김': ['kim', 'gim'],
  '박': ['park', 'pak', 'bak', 'parc'],
  '최': ['choi', 'choe', 'choy'],
  '정': ['jung', 'jeong', 'chung', 'joung', 'cheong'],
  '강': ['kang', 'gang'],
  '조': ['cho', 'jo', 'joe', 'joo'],
  '윤': ['yoon', 'yun', 'youn'],
  '장': ['jang', 'chang'],
  '임': ['lim', 'im', 'yim', 'rim'],
  '한': ['han', 'hahn'],
  '오': ['oh', 'o', 'oo'],
  '서': ['seo', 'suh', 'sur', 'west'],
  '신': ['shin', 'sin'],
  '권': ['kwon', 'gwon', 'kwun'],
  '황': ['hwang', 'whang'],
  '안': ['ahn', 'an'],
  '송': ['song'],
  '유': ['yoo', 'yu', 'you', 'yuu', 'u'],
  '류': ['ryu', 'ryoo', 'yoo', 'lyu', 'ryuu'],
  '홍': ['hong'],
  '전': ['jeon', 'jun', 'chun'],
  '고': ['ko', 'go', 'koh', 'goh'],
  '문': ['moon', 'mun'],
  '양': ['yang'],
  '손': ['son', 'sohn', 'shon'],
  '배': ['bae', 'pae'],
  '백': ['baek', 'paik', 'paek', 'beck', 'baec'],
  '허': ['huh', 'heo', 'hur', 'her'],
  '노': ['noh', 'no', 'roh', 'ro'],
  '남': ['nam', 'nahm'],
  '심': ['shim', 'sim'],
  '하': ['ha', 'hah'],
  '구': ['koo', 'gu', 'ku', 'goo'],
  '성': ['sung', 'seong'],
  '차': ['cha'],
  '주': ['joo', 'ju', 'chu', 'zoo'],
  '우': ['woo', 'u', 'oo'],
  '채': ['chae', 'chai'],
  '원': ['won', 'weon', 'one'],
  '천': ['chun', 'cheon'],
  '현': ['hyun', 'hyeon'],
  '변': ['byun', 'byeon', 'pyun'],
  '염': ['yeom', 'yum'],
  '석': ['seok', 'suk'],
  '선': ['sun', 'seon'],
  '설': ['sul', 'seol'],
  '연': ['yeon', 'yun', 'youn'],
  '명': ['myung', 'myeong'],
  '경': ['kyung', 'gyeong', 'kyoung'],
  '영': ['young', 'yeong', 'yung'],
  '국': ['kook', 'guk', 'kuk'],
  '섭': ['sub', 'seop', 'sup'],
  '엽': ['yup', 'yeop'],
  '철': ['chul', 'cheol'],
  '범': ['bum', 'beom', 'beum'],
  '수': ['soo', 'su', 'suh'],
  '호': ['ho', 'hoh'],
  '규': ['kyu', 'gyu'],
  '혁': ['hyuk', 'hyeok'],
  '은': ['eun', 'un'],
  '혜': ['hye', 'hae'],
  '희': ['hee', 'hui'],
  '츠': ['tsu', 'chu', 'z', 'ts', 'tz', 'zz'],
  '쓰': ['tsu', 'ssu', 's', 'th'],
  '즈': ['zu', 'z', 'ds', 'dz', 's', 'se', 'ze', 'es'],
  '스': ['su', 's', 'se', 'ce', 'ss', 'th', 'es'],
  '시': ['shi', 'si', 'shee', 'see', 'sy', 'ci', 'cy'],
  '지': ['ji', 'zi', 'gee', 'gi', 'ge', 'zy', 'gy'],
  '치': ['chi', 'ti', 'ch', 'tch'],
  '후': ['fu', 'hu', 'hoo', 'who'],
  '쇼': ['sho', 'syo', 'shou', 'syou'],
  '죠': ['jo', 'jyo', 'jou', 'zyo'],
  '쥬': ['ju', 'jyu', 'zyu', 'juu'],
  '쵸': ['cho', 'cyo', 'tyo'],
  '츄': ['chu', 'cyu', 'tyu'],
  '샤': ['sha', 'sya'],
  '슈': ['shu', 'syu', 'sch'],
  '랴': ['rya'],
  '료': ['ryo', 'ryou'],
  '쿄': ['kyo', 'kyou', 'gyo'],
  '큐': ['kyu', 'kyuu', 'gyu', 'cu', 'qu'],
  '캬': ['kya', 'gya'],
  '어': ['eo', 'uh', 'er', 'ar', 'or', 'ur', 'ir', 'our', 're', 'a'],
  '워': ['wo', 'weo', 'wer', 'war', 'wor'],
  '와': ['wa', 'wah', 'oir', 'uar'],
  '에': ['e', 'ae', 'eh', 'a', 'ai'],
  '애': ['ae', 'a', 'e'],
  '트': ['teu', 'tu', 't', 'te', 'tt', 'ght'],
  '드': ['deu', 'du', 'd', 'de', 'dd'],
  '크': ['keu', 'ku', 'k', 'ke', 'c', 'ck', 'ch', 'q', 'que'],
  '프': ['peu', 'pu', 'p', 'pe', 'f', 'fe', 'ph', 'ff', 'pp'],
  '브': ['beu', 'bu', 'v', 've', 'b', 'be'],
  '그': ['geu', 'gu', 'g', 'ge', 'gg', 'gue'],
  '르': ['reu', 'ru', 'r', 're', 'l', 'le'],
  '븐': ['beun', 'ven', 'ben', 'vn', 'bn', 'vne'],
  '든': ['deun', 'den', 'dn', 'don'],
  '튼': ['teun', 'ten', 'ton', 'tn'],
  '슨': ['seun', 'son', 'sen', 'sn'],
  '즌': ['jeun', 'zen', 'zon', 'son', 'zn'],
};

const syllableRomaCache = new Map();
const diphthongRomaCache = new Map();

function decomposeSyllable(ch) {
  const code = ch.charCodeAt(0) - 0xAC00;
  if (code < 0 || code > 11171) return null;
  return {
    choIdx: Math.floor(code / 588),
    jungIdx: Math.floor((code % 588) / 28),
    jongIdx: code % 28,
  };
}

function getSyllableRomanizations(ch) {
  if (syllableRomaCache.has(ch)) return syllableRomaCache.get(ch);
  const dec = decomposeSyllable(ch);
  if (!dec) return [];

  const { choIdx, jungIdx, jongIdx } = dec;
  const set = new Set();
  if (SPECIAL_SYLLABLE_ROMA[ch]) {
    for (const s of SPECIAL_SYLLABLE_ROMA[ch]) set.add(s);
  }

  const chos = CHO_ROMA[choIdx] || [''];
  const jungs = JUNG_ROMA[jungIdx] || [''];
  const jongs = JONG_ROMA[jongIdx] || [''];

  for (const c of chos) {
    for (const v of jungs) {
      for (const j of jongs) {
        const comb = c + v + j;
        if (comb.length >= 1) set.add(comb);
      }
    }
  }

  const list = [...set].sort((a, b) => b.length - a.length);
  syllableRomaCache.set(ch, list);
  return list;
}

function getDiphthongPairRomanizations(ch1, ch2) {
  const pairKey = ch1 + ch2;
  if (diphthongRomaCache.has(pairKey)) return diphthongRomaCache.get(pairKey);

  const d1 = decomposeSyllable(ch1);
  const d2 = decomposeSyllable(ch2);
  if (!d1 || !d2 || d1.jongIdx !== 0 || d2.choIdx !== 11) {
    diphthongRomaCache.set(pairKey, []);
    return [];
  }

  let vowels = null;
  // ㅏ + ㅣ(이/임/인/일/입/익) -> English /aɪ/ ('i', 'y', 'ie', 'ye', 'igh', 'ai', 'ay')
  if (d1.jungIdx === 0 && d2.jungIdx === 20) {
    vowels = ['i', 'y', 'ie', 'ye', 'igh', 'ai', 'ay', 'ei', 'ey', 'uy'];
  }
  // ㅔ/ㅐ + ㅣ(이/임/인/일/입/익) -> English /eɪ/ ('a', 'ai', 'ay', 'ea', 'ei', 'ey')
  else if ((d1.jungIdx === 5 || d1.jungIdx === 1) && d2.jungIdx === 20) {
    vowels = ['a', 'ai', 'ay', 'ea', 'ei', 'ey'];
  }
  // ㅗ + ㅜ(우/운/움/울) -> English /oʊ/ ('o', 'ow', 'ou', 'oa', 'oe')
  else if (d1.jungIdx === 8 && d2.jungIdx === 13) {
    vowels = ['o', 'ow', 'ou', 'oa', 'oe'];
  }

  if (!vowels) {
    diphthongRomaCache.set(pairKey, []);
    return [];
  }

  const chos = CHO_ROMA[d1.choIdx] || [''];
  const jongs = JONG_ROMA[d2.jongIdx] || [''];
  const set = new Set();
  for (const c of chos) {
    for (const v of vowels) {
      for (const j of jongs) {
        const comb = c + v + j;
        if (comb.length >= 1) set.add(comb);
      }
    }
  }

  const list = [...set].sort((a, b) => b.length - a.length);
  diphthongRomaCache.set(pairKey, list);
  return list;
}

function canMatchSyllablesToRoma(syllables, romaStr) {
  if (!syllables.length || !romaStr) return false;
  const n = syllables.length;
  const m = romaStr.length;
  if (m < Math.max(2, n - 2) || m > n * 6) return false;

  const memo = new Set();

  function dfs(sIdx, rIdx) {
    if (sIdx === n && rIdx === m) return true;
    if (sIdx === n || rIdx === m) return false;

    const key = sIdx * 200 + rIdx;
    if (memo.has(key)) return false;

    // 1. Standard 1-syllable match
    const candidates = getSyllableRomanizations(syllables[sIdx]);
    for (const cand of candidates) {
      if (romaStr.startsWith(cand, rIdx)) {
        if (dfs(sIdx + 1, rIdx + cand.length)) return true;
      }
    }

    // 2. Korean loanword geminate ㄹ (e.g. 블룸 -> bloom, 클래식 -> classic, 플라워 -> flower)
    if (sIdx + 1 < n) {
      const d1 = decomposeSyllable(syllables[sIdx]);
      const d2 = decomposeSyllable(syllables[sIdx + 1]);
      if (d1 && d2 && d1.jongIdx === 8 && d2.choIdx === 5) {
        const noBatchimCh = String.fromCharCode(0xAC00 + d1.choIdx * 588 + d1.jungIdx * 28);
        for (const cand of getSyllableRomanizations(noBatchimCh)) {
          if (romaStr.startsWith(cand, rIdx)) {
            if (dfs(sIdx + 1, rIdx + cand.length)) return true;
          }
        }
      }

      // 3. 2-syllable English diphthong match (e.g. 라이어 -> liar, 레이븐 -> raven, 타임 -> time)
      const diphCands = getDiphthongPairRomanizations(syllables[sIdx], syllables[sIdx + 1]);
      for (const cand of diphCands) {
        if (romaStr.startsWith(cand, rIdx)) {
          if (dfs(sIdx + 2, rIdx + cand.length)) return true;
        }
      }
    }

    memo.add(key);
    return false;
  }

  return dfs(0, 0);
}

/**
 * Checks whether a Hangul string and a Romanized string (Korean, Japanese, or English) match phonetically,
 * supporting both Surname+Given and Given+Surname orders for artists (e.g. "백예린" <-> "Yerin Baek",
 * "이승윤" <-> "Lee Seung Yoon", "다카하시 리에" <-> "Takahashi Rie" / "Rie Takahashi") as well as
 * Romaji and English song titles (e.g. "요다카" <-> "Yodaka", "비바리움" <-> "Vivarium", "라이어" <-> "Liar").
 */
export function matchesRomanizedName(guess: string, target: string, options: any = {}): boolean {
  if (!guess || !target || typeof guess !== 'string' || typeof target !== 'string') return false;
  const korStr = guess.trim();
  const latStr = target.trim();
  if (!/^[가-힣\s]+$/.test(korStr)) return false;
  if (/[가-힣\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(latStr) || !/[a-zA-Z]{2,}/.test(latStr)) {
    return false;
  }

  const isArtist = options.isArtist !== false;

  const korVariants = expandJapaneseKoreanVariants(korStr);
  if (!korVariants.includes(korStr)) korVariants.unshift(korStr);

  const rawLatForms = [latStr.toLowerCase()];
  if (/\d/.test(latStr)) {
    rawLatForms.push(
      latStr
        .toLowerCase()
        .replace(/l3/g, 'b')
        .replace(/0/g, 'o')
        .replace(/3/g, 'e')
        .replace(/1/g, 'i')
        .replace(/4/g, 'a')
        .replace(/5/g, 's')
        .replace(/7/g, 't')
    );
  }

  const romaCandidates = new Set();
  for (const rawForm of rawLatForms) {
    const latClean = rawForm.replace(/[^a-z\s]/g, ' ').trim();
    const latTokens = latClean.split(/\s+/).filter(Boolean);
    const latJoined = latTokens.join('');
    if (latJoined.length < 2) continue;

    romaCandidates.add(latJoined);
    if (isArtist) {
      if (latTokens.length === 2) {
        // Reversed Given + Surname or Surname + Given
        romaCandidates.add(latTokens[1] + latTokens[0]);
      } else if (latTokens.length === 3) {
        // e.g. "Yerin Baek" vs "Baek Ye Rin" or "Ye Rin Baek"
        romaCandidates.add(latTokens[2] + latTokens[0] + latTokens[1]);
        romaCandidates.add(latTokens[1] + latTokens[2] + latTokens[0]);
      }
    }
  }

  if (romaCandidates.size === 0) return false;

  for (const kv of korVariants.slice(0, 12)) {
    const syllables = [...kv.replace(/\s+/g, '')];
    if (syllables.length < 2 || syllables.length > 16) continue;

    const sylOrders = [syllables];
    if (isArtist && syllables.length === 3) {
      // Korean 3-syllable name: [Surname, Given1, Given2] -> also check [Given1, Given2, Surname]
      sylOrders.push([syllables[1], syllables[2], syllables[0]]);
    }

    for (const order of sylOrders) {
      for (const roma of romaCandidates) {
        if (canMatchSyllablesToRoma(order, roma)) {
          return true;
        }
      }
    }
  }

  return false;
}

