import assert from 'node:assert/strict';
import { normalize, distance, matches, answerCorrect, validSlot, getKoreanDisplay } from '../server/rules.js';
import { tracks } from '../shared/tracks.js';

assert.equal(normalize(' 새벽  고요! '), '새벽고요');
assert.equal(distance('새벽고요', '새벽고오'), 1);
assert.equal(matches('새벽고오', '새벽 고요'), true, '한 글자 오타 허용');
assert.equal(matches('새벽고', '새벽 고요'), false, '짧은 입력은 오타 허용 안 함');
assert.equal(matches('하늘', '정하늘', ['하늘']), true, '명시적 별칭 허용');
assert.equal(matches('하늘', '정하늘', []), false, '미등록 별칭은 거절');

// Cheerful Vibes Echo 및 괄호/공백 유연성 테스트
const cheerfulTitle = 'Cheerful Vibes Echo (音乃瀬奏 SOLO)';
assert.equal(matches('cheerful vibes echo', cheerfulTitle), true, '소문자 + 띄어쓰기 정답');
assert.equal(matches('cheerfulvibesecho', cheerfulTitle), true, '띄어쓰기 없이도 정답');
assert.equal(matches('CHEERFUL VIBES ECHO', cheerfulTitle), true, '대문자 정답');
assert.equal(matches('cheerful vibes ech', cheerfulTitle), true, '1글자 오타 허용');
assert.equal(matches('cheerful vibes', cheerfulTitle), false, '단어 누락 오답');

// 부제, 인스트루멘탈, 다중 아티스트 유연성 테스트
assert.equal(matches('dynamite', 'Dynamite (Instrumental)'), true, 'Instrumental 제거 후 본제 매칭');
assert.equal(matches('instrumental', 'Dynamite (Instrumental)'), false, 'Instrumental 단독 입력은 오답');
assert.equal(matches('good day', '좋은 날 (Good Day)'), true, '괄호 안 대체 외국어 제목 매칭');
assert.equal(matches('goodday', '좋은 날 (Good Day)'), true, '외국어 제목 띄어쓰기 없이도 매칭');
assert.equal(matches('timbaland', 'Timbaland, Keri Hilson, D.O.E.'), true, '콜라보레이션 대표 가수 매칭');
assert.equal(matches('keri hilson', 'Timbaland, Keri Hilson, D.O.E.'), true, '콜라보레이션 참여 가수 매칭');
assert.equal(matches('kerihilson', 'Timbaland, Keri Hilson, D.O.E.'), true, '가수 이름 띄어쓰기 없이도 매칭');

// 일본 가수 / 일본 노래: 한국어 및 일본어 발음의 영어(Romaji) 매칭 테스트
assert.equal(matches('오토노세 카나데', '音乃瀬奏'), true, '일본 가수 한국어 발음 매칭');
assert.equal(matches('오토노세카나데', '音乃瀬奏'), true, '일본 가수 한국어 발음 띄어쓰기 없이 매칭');
assert.equal(matches('otonose kanade', '音乃瀬奏'), true, '일본 가수 영어(Romaji) 발음 매칭');
assert.equal(matches('otonosekanade', '音乃瀬奏'), true, '일본 가수 영어 발음 띄어쓰기 없이 매칭');
assert.equal(matches('오토노세 카나데', cheerfulTitle), true, '부제 포함 트랙에서 일본 가수 한국어 발음 매칭');
assert.equal(matches('otonose kanade', cheerfulTitle), true, '부제 포함 트랙에서 일본 가수 영어 발음 매칭');

assert.equal(matches('요루니 카케루', '夜に駆ける'), true, '일본 곡 한국어 발음 매칭');
assert.equal(matches('요루니카케루', '夜に駆ける'), true, '일본 곡 한국어 발음 띄어쓰기 없이 매칭');
assert.equal(matches('yoru ni kakeru', '夜に駆ける'), true, '일본 곡 영어(Romaji) 발음 매칭');
assert.equal(matches('yorunikakeru', '夜に駆ける'), true, '일본 곡 영어 발음 띄어쓰기 없이 매칭');
assert.equal(matches('racing into the night', '夜に駆ける'), true, '일본 곡 공식 영어 제목 매칭');
assert.equal(matches('밤을 달리다', '夜に駆ける'), true, '일본 곡 한국어 번역 제목 매칭');

assert.equal(matches('요아소비', 'YOASOBI'), true, 'YOASOBI 한국어 매칭');
assert.equal(matches('요네즈 켄시', '米津玄師'), true, '米津玄師 한국어 매칭');
assert.equal(matches('kenshi yonezu', '米津玄師'), true, '米津玄師 영어 이름 매칭');
assert.equal(matches('yonezu kenshi', '米津玄師'), true, '米津玄師 영어 이름 매칭');

assert.equal(matches('요루시카', 'ヨルシカ'), true, '가나 문자 한국어 자동 변환 매칭');
assert.equal(matches('yorushika', 'ヨルシカ'), true, '가나 문자 Romaji 자동 변환 매칭');
assert.equal(matches('아이돌', 'アイドル'), true, '가나 문자 한국어 매칭');
assert.equal(matches('aidoru', 'アイドル'), true, '가나 문자 Romaji 매칭');
assert.equal(matches('카타오모이', 'カタオモイ'), true, '가나 문자 한국어 매칭');
assert.equal(matches('kataomoi', 'カタオモイ'), true, '가나 문자 Romaji 매칭');

assert.equal(matches('드라이 플라워', 'ドライフラワー'), true, 'ドライフラワー 한국어 매칭');
assert.equal(matches('드라이플라워', 'ドライフラワー'), true, '드라이플라워 띄어쓰기 없이 매칭');
assert.equal(matches('dry flower', 'ドライフラワー'), true, 'dry flower 영어 매칭');

// CV(성우) 및 캐릭터명 분리 매칭 테스트 (望月杏奈 (CV.夏川椎菜))
const annaTrack = '望月杏奈 (CV.夏川椎菜)';
assert.equal(matches('모치즈키 안나', annaTrack), true, '캐릭터명 한국어 매칭');
assert.equal(matches('모치즈키안나', annaTrack), true, '캐릭터명 띄어쓰기 없이 한국어 매칭');
assert.equal(matches('나츠카와 시이나', annaTrack), true, '성우명 한국어 매칭');
assert.equal(matches('나츠카와시이나', annaTrack), true, '성우명 띄어쓰기 없이 한국어 매칭');
assert.equal(matches('mochizuki anna', annaTrack), true, '캐릭터명 영어(Romaji) 매칭');
assert.equal(matches('natsukawa shiina', annaTrack), true, '성우명 영어(Romaji) 매칭');

// 밴드명 한국어 / 영문 매칭 테스트 (kessoku band, 結束バンド)
assert.equal(matches('결속밴드', 'kessoku band'), true, '영문 밴드명 한글 매칭');
assert.equal(matches('결속 밴드', 'kessoku band'), true, '영문 밴드명 한글 띄어쓰기 매칭');
assert.equal(matches('케속밴드', 'kessoku band'), true, '영문 밴드명 음차 매칭');
assert.equal(matches('결속밴드', '結束バンド'), true, '한자 밴드명 한글 매칭');
assert.equal(matches('kessoku band', '結束バンド'), true, '한자 밴드명 영문 매칭');

// 영어 단어/제목 한국어 외래어 음차 매칭 테스트 (Garden -> 가든)
assert.equal(matches('가든', 'Garden'), true, '단일 영단어 곡명 한국어 발음 매칭');
assert.equal(matches('garden', 'Garden'), true, '단일 영단어 곡명 영문 매칭');
assert.equal(matches('블루 버드', 'Blue Bird'), true, '복수 영단어 곡명 한국어 발음 매칭');
assert.equal(matches('블루버드', 'Blue Bird'), true, '복수 영단어 곡명 한국어 띄어쓰기 없이 매칭');
assert.equal(matches('피스 사인', 'Peace Sign'), true, 'Peace Sign 한국어 발음 매칭');
assert.equal(matches('믹스 너츠', 'Mixed Nuts'), true, 'Mixed Nuts 한국어 발음 매칭');
assert.equal(matches('온리 마이 레일건', 'only my railgun'), true, 'only my railgun 한국어 발음 매칭');

// 단일 활동명 아티스트(성/이름 구분 없음) vs 이름+성 구분 아티스트 정답 검증 테스트
// 1. 단일 활동명: 끝 글자를 생략한 미완성 입력은 오답이어야 하며, 전부 적어야 정답
assert.equal(matches('lila', 'Lilas', [], { isArtist: true }), false, 'Lilas에 lila는 미완성 입력으로 오답');
assert.equal(matches('lilas', 'Lilas', [], { isArtist: true }), true, 'Lilas 전원 입력은 정답');
assert.equal(matches('리라', 'Lilas', [], { isArtist: true }), true, 'Lilas 한국어 발음 정답');
assert.equal(matches('crus', 'Crush', [], { isArtist: true }), false, 'Crush에 crus는 미완성 오답');
assert.equal(matches('crush', 'Crush', [], { isArtist: true }), true, 'Crush 전원 입력 정답');
assert.equal(matches('vaund', 'Vaundy', [], { isArtist: true }), false, 'Vaundy에 vaund는 미완성 오답');
assert.equal(matches('vaundy', 'Vaundy', [], { isArtist: true }), true, 'Vaundy 전원 입력 정답');
assert.equal(matches('stay', 'STAYC', [], { isArtist: true }), false, 'STAYC에 stay는 미완성 오답');
assert.equal(matches('stayc', 'STAYC', [], { isArtist: true }), true, 'STAYC 전원 입력 정답');
assert.equal(matches('aime', 'Aimer', [], { isArtist: true }), false, 'Aimer에 aime는 미완성 오답');
assert.equal(matches('aimer', 'Aimer', [], { isArtist: true }), true, 'Aimer 전원 입력 정답');

// 2. 영어권 가수: 풀네임으로 적어야 정답 처리 (이름이나 성만 입력 시 오답)
assert.equal(matches('taylor', 'Taylor Swift', [], { isArtist: true }), false, 'Taylor Swift에 이름 Taylor만 입력은 오답');
assert.equal(matches('테일러', 'Taylor Swift', [], { isArtist: true }), false, 'Taylor Swift에 한국어 이름 테일러만 입력은 오답');
assert.equal(matches('Taylor Swift', 'Taylor Swift', [], { isArtist: true }), true, 'Taylor Swift 영어 풀네임 정답');
assert.equal(matches('테일러 스위프트', 'Taylor Swift', [], { isArtist: true }), true, 'Taylor Swift 한국어 풀네임 정답');
assert.equal(matches('bruno', 'Bruno Mars', [], { isArtist: true }), false, 'Bruno Mars에 이름 Bruno만 입력은 오답');
assert.equal(matches('브루노', 'Bruno Mars', [], { isArtist: true }), false, 'Bruno Mars에 한국어 이름 브루노만 입력은 오답');
assert.equal(matches('Bruno Mars', 'Bruno Mars', [], { isArtist: true }), true, 'Bruno Mars 영어 풀네임 정답');
assert.equal(matches('브루노 마스', 'Bruno Mars', [], { isArtist: true }), true, 'Bruno Mars 한국어 풀네임 정답');
assert.equal(matches('justin', 'Justin Bieber', [], { isArtist: true }), false, 'Justin Bieber에 이름 Justin만 입력은 오답');
assert.equal(matches('Justin Bieber', 'Justin Bieber', [], { isArtist: true }), true, 'Justin Bieber 영어 풀네임 정답');
assert.equal(matches('저스틴 비버', 'Justin Bieber', [], { isArtist: true }), true, 'Justin Bieber 한국어 풀네임 정답');

// 3. 일본어권 가수: 성만 적으면 오답, 이름만 적거나 풀네임은 정답
// 3-1. 幾田りら(이쿠타 리라): 성(幾田/이쿠타/ikuta) 오답, 이름(りら/리라/Lilas) 정답
assert.equal(matches('幾田', '幾田りら', [], { isArtist: true }), false, '幾田り라에 성(幾田)만 입력은 오답');
assert.equal(matches('이쿠타', '幾田りら', [], { isArtist: true }), false, '幾田り라에 성(이쿠타)만 입력은 오답');
assert.equal(matches('ikuta', '幾田りら', [], { isArtist: true }), false, '幾田り라에 성(ikuta)만 입력은 오답');
assert.equal(matches('りら', '幾田りら', [], { isArtist: true }), true, '幾田り라에 이름(りら)만 입력 정답');
assert.equal(matches('리라', '幾田りら', [], { isArtist: true }), true, '幾田り라에 이름(리라)만 입력 정답');
assert.equal(matches('lilas', '幾田りら', [], { isArtist: true }), true, '幾田り라에 이름(Lilas)만 입력 정답');
assert.equal(matches('lila', '幾田りら', [], { isArtist: true }), false, '幾田り라에 미완성 lila 입력은 오답');
assert.equal(matches('幾田りら', '幾田りら', [], { isArtist: true }), true, '幾田り라 일본어 풀네임 정답');
assert.equal(matches('이쿠타 리라', '幾田りら', [], { isArtist: true }), true, '幾田り라 한국어 풀네임 정답');

// 3-2. 夏川椎菜(나츠카와 시이나): 성(夏川/나츠카와/natsukawa) 오답, 이름(椎菜/시이나/shiina) 정답
assert.equal(matches('夏川', '夏川椎菜', [], { isArtist: true }), false, '夏川椎菜에 성(夏川)만 입력은 오답');
assert.equal(matches('나츠카와', '夏川椎菜', [], { isArtist: true }), false, '夏川椎菜에 성(나츠카와)만 입력은 오답');
assert.equal(matches('natsukawa', '夏川椎菜', [], { isArtist: true }), false, '夏川椎菜에 성(natsukawa)만 입력은 오답');
assert.equal(matches('椎菜', '夏川椎菜', [], { isArtist: true }), true, '夏川椎菜에 이름(椎菜)만 입력 정답');
assert.equal(matches('시이나', '夏川椎菜', [], { isArtist: true }), true, '夏川椎菜에 이름(시이나)만 입력 정답');
assert.equal(matches('shiina', '夏川椎菜', [], { isArtist: true }), true, '夏川椎菜에 이름(shiina)만 입력 정답');
assert.equal(matches('夏川椎菜', '夏川椎菜', [], { isArtist: true }), true, '夏川椎菜 일본어 풀네임 정답');
assert.equal(matches('나츠카와 시이나', '夏川椎菜', [], { isArtist: true }), true, '夏川椎菜 한국어 풀네임 정답');

// 3-3. 望月杏奈(모치즈키 안나): 성(望月/모치즈키/mochizuki) 오답, 이름(杏奈/안나/anna) 정답
assert.equal(matches('望月', '望月杏奈', [], { isArtist: true }), false, '望月杏奈에 성(望月)만 입력은 오답');
assert.equal(matches('모치즈키', '望月杏奈', [], { isArtist: true }), false, '望月杏奈에 성(모치즈키)만 입력은 오답');
assert.equal(matches('mochizuki', '望月杏奈', [], { isArtist: true }), false, '望月杏奈에 성(mochizuki)만 입력은 오답');
assert.equal(matches('杏奈', '望月杏奈', [], { isArtist: true }), true, '望月杏奈에 이름(杏奈)만 입력 정답');
assert.equal(matches('안나', '望月杏奈', [], { isArtist: true }), true, '望月杏奈에 이름(안나)만 입력 정답');
assert.equal(matches('anna', '望月杏奈', [], { isArtist: true }), true, '望月杏奈에 이름(anna)만 입력 정답');
assert.equal(matches('望月杏奈', '望月杏奈', [], { isArtist: true }), true, '望月杏奈 일본어 풀네임 정답');
assert.equal(matches('모치즈키 안나', '望月杏奈', [], { isArtist: true }), true, '望月杏奈 한국어 풀네임 정답');

// 3-4. 音乃瀬奏(오토노세 카나데): 성(音乃瀬/오토노세/otonose) 오답, 이름(奏/카나데/kanade) 정답
assert.equal(matches('音乃瀬', '音乃瀬奏', [], { isArtist: true }), false, '音乃瀬奏에 성(音乃瀬)만 입력은 오답');
assert.equal(matches('오토노세', '音乃瀬奏', [], { isArtist: true }), false, '音乃瀬奏에 성(오토노세)만 입력은 오답');
assert.equal(matches('otonose', '音乃瀬奏', [], { isArtist: true }), false, '音乃瀬奏에 성(otonose)만 입력은 오답');
assert.equal(matches('奏', '音乃瀬奏', [], { isArtist: true }), true, '音乃瀬奏에 이름(奏)만 입력 정답');
assert.equal(matches('카나데', '音乃瀬奏', [], { isArtist: true }), true, '音乃瀬奏에 이름(카나데)만 입력 정답');
assert.equal(matches('kanade', '音乃瀬奏', [], { isArtist: true }), true, '音乃瀬奏에 이름(kanade)만 입력 정답');
assert.equal(matches('音乃瀬奏', '音乃瀬奏', [], { isArtist: true }), true, '音乃瀬奏 일본어 풀네임 정답');
assert.equal(matches('오토노세 카나데', '音乃瀬奏', [], { isArtist: true }), true, '音乃瀬奏 한국어 풀네임 정답');

// 3-5. 米津玄師(요네즈 켄시): 성(米津/요네즈/yonezu) 오답, 이름(玄師/켄시/kenshi) 정답
assert.equal(matches('米津', '米津玄師', [], { isArtist: true }), false, '米津玄師에 성(米津)만 입력은 오답');
assert.equal(matches('요네즈', '米津玄師', [], { isArtist: true }), false, '米津玄師에 성(요네즈)만 입력은 오답');
assert.equal(matches('yonezu', '米津玄師', [], { isArtist: true }), false, '米津玄師에 성(yonezu)만 입력은 오답');
assert.equal(matches('玄師', '米津玄師', [], { isArtist: true }), true, '米津玄師에 이름(玄師)만 입력 정답');
assert.equal(matches('켄시', '米津玄師', [], { isArtist: true }), true, '米津玄師에 이름(켄시)만 입력 정답');
assert.equal(matches('kenshi', '米津玄師', [], { isArtist: true }), true, '米津玄師에 이름(kenshi)만 입력 정답');
assert.equal(matches('米津玄師', '米津玄師', [], { isArtist: true }), true, '米津玄師 일본어 풀네임 정답');
assert.equal(matches('요네즈 켄시', '米津玄師', [], { isArtist: true }), true, '米津玄師 한국어 풀네임 정답');

// 3-6. 星野源(호시노 겐): 성(星野/호시노/hoshino) 오답, 이름(源/겐/gen) 정답
assert.equal(matches('星野', '星野源', [], { isArtist: true }), false, '星野源에 성(星野)만 입력은 오답');
assert.equal(matches('호시노', '星野源', [], { isArtist: true }), false, '星野源에 성(호시노)만 입력은 오답');
assert.equal(matches('hoshino', '星野源', [], { isArtist: true }), false, '星野源에 성(hoshino)만 입력은 오답');
assert.equal(matches('源', '星野源', [], { isArtist: true }), true, '星野源에 이름(源)만 입력 정답');
assert.equal(matches('겐', '星野源', [], { isArtist: true }), true, '星野源에 이름(겐)만 입력 정답');
assert.equal(matches('gen', '星野源', [], { isArtist: true }), true, '星野源에 이름(gen)만 입력 정답');
assert.equal(matches('星野源', '星野源', [], { isArtist: true }), true, '星野源 일본어 풀네임 정답');
assert.equal(matches('호시노 겐', '星野源', [], { isArtist: true }), true, '星野源 한국어 풀네임 정답');

// 3-7. 望月杏奈 (CV.夏川椎菜): 복합 아티스트 성 오답 및 이름/풀네임 정답 검증
assert.equal(matches('모치즈키 안나', '望月杏奈 (CV.夏川椎菜)', [], { isArtist: true }), true);
assert.equal(matches('안나', '望月杏奈 (CV.夏川椎菜)', [], { isArtist: true }), true);
assert.equal(matches('모치즈키', '望月杏奈 (CV.夏川椎菜)', [], { isArtist: true }), false);
assert.equal(matches('나츠카와 시이나', '望月杏奈 (CV.夏川椎菜)', [], { isArtist: true }), true);
assert.equal(matches('시이나', '望月杏奈 (CV.夏川椎菜)', [], { isArtist: true }), true);
assert.equal(matches('나츠카와', '望月杏奈 (CV.夏川椎菜)', [], { isArtist: true }), false);

const track = tracks[0];
assert.equal(answerCorrect(track, 'title', '좋은 날', ''), true);
assert.equal(answerCorrect(track, 'title', '좋은날', '아무개'), true);
assert.equal(answerCorrect(track, 'artist', '', 'iu'), true);
assert.equal(answerCorrect(track, 'both', '좋은 날', '아이유'), true);
assert.equal(answerCorrect(track, 'both', '좋은 날', ''), false);
assert.equal(answerCorrect(track, 'both', '', '아이유'), false);
assert.equal(answerCorrect(track, 'artist', '좋은 날', ''), false, '가수 모드에서 제목 입력은 오답');
const line = [{ year: 2005 }, { year: 2011 }, { year: 2021 }];
assert.equal(validSlot(line, 2008, 1), true);
assert.equal(validSlot(line, 2008, 2), false, '잘못된 위치');
assert.equal(validSlot(line, 2005, 1), true, '같은 연도 경계 포함');
assert.equal(validSlot(line, 2011, 1), true, '같은 연도 왼쪽 경계');
assert.equal(validSlot(line, 2021, 3), true);
assert.equal(validSlot(line, 2004, 0), true);
assert.equal(validSlot(line, 2022, 3), true, '맨 뒤 삽입은 성공');
assert.equal(validSlot(line, 2022, 2), false, '2021 앞에 2022는 잘못된 위치');

// 한국어 기준 제목 및 가수 표시 (getKoreanDisplay) 테스트
assert.equal(getKoreanDisplay('音乃瀬奏'), '오토노세 카나데 (音乃瀬奏)');
assert.equal(getKoreanDisplay('YOASOBI'), '요아소비 (YOASOBI)');
assert.equal(getKoreanDisplay('夜に駆ける'), '요루니 카케루 (夜に駆ける)');
assert.equal(getKoreanDisplay('ヨルシカ'), '요루시카 (ヨルシカ)');
assert.equal(getKoreanDisplay('アイドル'), '아이돌 (アイドル)');
assert.equal(getKoreanDisplay('Taylor Swift'), '테일러 스위프트 (Taylor Swift)');
assert.equal(getKoreanDisplay('Bruno Mars'), '브루노 마스 (Bruno Mars)');
assert.equal(getKoreanDisplay('NewJeans'), '뉴진스 (NewJeans)');
assert.equal(getKoreanDisplay('Shape of You'), '쉐이프 오브 유 (Shape of You)');
assert.equal(getKoreanDisplay('아이유'), '아이유', '이미 한국어인 가수는 그대로 유지');
assert.equal(getKoreanDisplay('좋은 날'), '좋은 날', '이미 한국어인 제목은 그대로 유지');
assert.equal(getKoreanDisplay('Cheerful Vibes Echo (音乃瀬奏 SOLO)'), '치어풀 바이브스 에코 (오토노세 카나데 SOLO)', '부제 내 일본어 및 본제 한국어 변환');
assert.equal(getKoreanDisplay('望月杏奈 (CV.夏川椎菜)'), '모치즈키 안나 (CV.나츠카와 시이나)', '캐릭터 및 성우 한국어 변환');
assert.equal(getKoreanDisplay('kessoku band'), '결속밴드 (kessoku band)', 'kessoku band 한국어 변환');
assert.equal(getKoreanDisplay('Garden'), '가든 (Garden)', 'Garden 한국어 변환');
assert.equal(getKoreanDisplay('Hype Boy', ['하입보이', 'hypeboy']), '하입보이 (Hype Boy)', '별칭의 한국어 우선 표기');

// 대규모 3개국어(일/한/영) 공식 사전 매핑 테스트
// 1. 애니메이션 히트곡: 한국어 번역명, 음차, 영문명
assert.equal(matches('홍련의 화살', '紅蓮の弓矢'), true, '紅蓮の弓矢 한국어 번역 정답');
assert.equal(matches('guren no yumiya', '紅蓮の弓矢'), true, '紅蓮の弓矢 로마자 정답');
assert.equal(matches('홍련화', '紅蓮華'), true, '紅蓮華 한국어 번역 정답');
assert.equal(matches('gurenge', '紅蓮華'), true, '紅蓮華 영문 정답');
assert.equal(matches('신시대', '新時代'), true, '新時代 한국어 번역 정답');
assert.equal(matches('new genesis', '新時代'), true, '新時代 공식 영문 정답');
assert.equal(matches('괴수의 꽃노래', '怪獣の花唄'), true, '怪獣の花唄 한국어 정답');
assert.equal(matches('카이쥬노 하나우타', '怪獣の花唄'), true, '怪獣の花唄 음차 정답');
assert.equal(matches('별자리가 될 수 있다면', '星座になれたら'), true, '星座になれたら 한국어 번역 정답');
assert.equal(matches('그저 네게 맑아라', 'ただ君に晴れ'), true, 'ただ君に晴れ 한국어 번역 정답');
assert.equal(matches('tada kimi ni hare', 'ただ君に晴れ'), true, 'ただ君に晴れ 로마자 정답');

// 2. 보컬로이드 클래식: 한국어명, 영문명
assert.equal(matches('천본앵', '千本桜'), true, '千本桜 한국어 번역 정답');
assert.equal(matches('senbonzakura', '千本桜'), true, '千本桜 영문 정답');
assert.equal(matches('롤링 걸', 'ローリンガール'), true, 'ローリンガール 한국어 정답');
assert.equal(matches('rolling girl', 'ローリンガール'), true, 'ローリンガール 영문 정답');
assert.equal(matches('뱀파이어', 'ヴァンパイア'), true, 'ヴァンパイア 한국어 정답');
assert.equal(matches('vampire', 'ヴァンパイア'), true, 'ヴァンパイア 영문 정답');
assert.equal(matches('로스트원의 호곡', 'ロストワンの号哭'), true, 'ロストワンの号哭 한국어 번역 정답');
assert.equal(matches('굿바이 선언', 'グッバイ宣言'), true, 'グッバイ宣言 한국어 정답');
assert.equal(matches('goodbye sengen', 'グッバイ宣言'), true, 'グッバイ宣言 영문 정답');
assert.equal(matches('킹', 'KING'), true, 'KING 한국어 정답');
assert.equal(matches('king', 'KING'), true, 'KING 영문 정답');

// 3. 버튜버 대표곡 및 공식 한국어 표기 검증
assert.equal(matches('스텔라 스텔라', 'Stellar Stellar'), true, 'Stellar Stellar 한국어 정답');
assert.equal(matches('비비디바', 'ビビデバ'), true, 'ビビデバ 공식 한국어 표기(비비디바) 정답');
assert.equal(matches('비비데바', 'ビビデバ'), true, 'ビビデバ 가나 음차(비비데바)도 허용');
assert.equal(matches('bibbidiba', 'ビビデバ'), true, 'ビビデバ 영문 정답');
assert.equal(getKoreanDisplay('ビビデバ'), '비비디바 (ビビデバ)', 'ビビデバ 대표 한국어 표기는 비비디바');
assert.equal(matches('웃세와', 'うっせぇわ'), true, 'うっせぇわ 공식 통용 표기(웃세와) 정답');
assert.equal(matches('시끄러워', 'うっせぇわ'), true, 'うっせぇわ 번역 표기(시끄러워) 정답');
assert.equal(matches('멜라', 'Mela!'), true, 'Mela! 공식 한국어 표기(멜라) 정답');
assert.equal(matches('아호이 우리들은 호쇼 해적단', 'Ahoy!! 我ら宝鐘海賊団☆'), true, 'Ahoy!! 우리들은 호쇼 해적단 공식 표기 정답');
assert.equal(matches('논브레스 오블리주', 'ノンブレス・オブリージュ'), true, '논브레스 오블리주 공식 표기 정답');
assert.equal(matches('로리신 레퀴엠', '粛聖!! ロリ神レクイエム☆'), true, '로리신 레퀴엠 한국어 정답');
assert.equal(matches('미소녀무죄 파이레츠', '美少女無罪♡パイレーツ'), true, '미소녀무죄 파이레츠 한국어 정답');
assert.equal(matches('만찬가', '晩餐歌'), true, '晩餐歌 한국어 번역(만찬가) 정답');
assert.equal(matches('반산카', '晩餐歌'), true, '晩餐歌 음차(반산카) 정답');
assert.equal(matches('잔향산가', '残響散歌'), true, '残響散歌 한국어 한자음(잔향산가) 정답');
assert.equal(matches('잔쿄산카', '残響散歌'), true, '残響散歌 일본어 발음(잔쿄산카) 정답');

// 4. K-Pop 영문 트랙명 ↔ 한국어 공식 곡명 매칭 검증
assert.equal(matches('예뻤어', 'You Were Beautiful'), true, 'DAY6 You Were Beautiful -> 예뻤어 정답');
assert.equal(matches('한 페이지가 될 수 있게', 'Time of Our Life'), true, 'DAY6 Time of Our Life -> 한 페이지가 될 수 있게 정답');
assert.equal(matches('고민중독', 'T.B.H'), true, 'QWER T.B.H -> 고민중독 정답');
assert.equal(matches('내 이름 맑음', 'My Name is Malguem'), true, 'QWER My Name is Malguem -> 내 이름 맑음 정답');
assert.equal(matches('밤편지', 'Through the Night'), true, 'IU Through the Night -> 밤편지 정답');
assert.equal(matches('사건의 지평선', 'Event Horizon'), true, '윤하 Event Horizon -> 사건의 지평선 정답');
assert.equal(matches('첫 만남은 계획대로 되지 않아', 'plot twist'), true, 'TWS plot twist -> 첫 만남은 계획대로 되지 않아 정답');

// 5. 추가된 일본어권 가수: 성 오답, 이름/풀네임 정답 검증
// 시구레 우이(しぐれうい): 성(시구레/shigure) 오답, 이름(우이/ui) 정답
assert.equal(matches('시구레', 'しぐれうい', [], { isArtist: true }), false, '시구레 우이에 성(시구레) 오답');
assert.equal(matches('shigure', 'しぐれうい', [], { isArtist: true }), false, '시구레 우이에 성(shigure) 오답');
assert.equal(matches('우이', 'しぐれうい', [], { isArtist: true }), true, '시구레 우이에 이름(우이) 정답');
assert.equal(matches('ui', 'しぐれうい', [], { isArtist: true }), true, '시구레 우이에 이름(ui) 정답');
assert.equal(matches('시구레 우이', 'しぐれうい', [], { isArtist: true }), true, '시구레 우이 풀네임 정답');

// 칸자키 이오리(神崎イオリ): 성(칸자키/kanzaki) 오답, 이름(이오리/iori) 정답
assert.equal(matches('칸자키', '神崎イオリ', [], { isArtist: true }), false, '칸자키 이오리에 성(칸자키) 오답');
assert.equal(matches('kanzaki', '神崎イオリ', [], { isArtist: true }), false, '칸자키 이오리에 성(kanzaki) 오답');
assert.equal(matches('이오리', '神崎イオリ', [], { isArtist: true }), true, '칸자키 이오리에 이름(이오리) 정답');
assert.equal(matches('iori', '神崎イオリ', [], { isArtist: true }), true, '칸자키 이오리에 이름(iori) 정답');
assert.equal(matches('칸자키 이오리', '神崎イオリ', [], { isArtist: true }), true, '칸자키 이오리 풀네임 정답');

// 6. 한국 아티스트 영문 표기 ↔ 한국어 표기/약칭/본명 양방향 정답 검증
assert.equal(matches('정국', 'Jung Kook', [], { isArtist: true }), true, 'Jung Kook -> 정국 정답');
assert.equal(matches('전정국', 'Jung Kook', [], { isArtist: true }), true, 'Jung Kook -> 전정국 정답');
assert.equal(matches('악뮤', 'AKMU', [], { isArtist: true }), true, 'AKMU -> 악뮤 정답');
assert.equal(matches('악동뮤지션', 'AKMU', [], { isArtist: true }), true, 'AKMU -> 악동뮤지션 정답');
assert.equal(matches('악뮤', 'Akdong Musician', [], { isArtist: true }), true, 'Akdong Musician -> 악뮤 정답');
assert.equal(matches('볼빨간사춘기', 'BOL4', [], { isArtist: true }), true, 'BOL4 -> 볼빨간사춘기 정답');
assert.equal(matches('볼사', 'BOL4', [], { isArtist: true }), true, 'BOL4 -> 볼사 정답');
assert.equal(matches('엠씨더맥스', 'M.C the MAX', [], { isArtist: true }), true, 'M.C the MAX -> 엠씨더맥스 정답');
assert.equal(matches('엠씨더맥스', 'M.C. the MAX', [], { isArtist: true }), true, 'M.C. the MAX -> 엠씨더맥스 정답');
assert.equal(matches('카더가든', 'Car, the garden', [], { isArtist: true }), true, 'Car, the garden -> 카더가든 정답');
assert.equal(matches('(여자)아이들', '(G)I-DLE', [], { isArtist: true }), true, '(G)I-DLE -> (여자)아이들 정답');
assert.equal(matches('여자아이들', '(G)I-DLE', [], { isArtist: true }), true, '(G)I-DLE -> 여자아이들 정답');
assert.equal(matches('아이들', '(G)I-DLE', [], { isArtist: true }), true, '(G)I-DLE -> 아이들 정답');
assert.equal(matches('투모로우바이투게더', 'TOMORROW X TOGETHER', [], { isArtist: true }), true, 'TOMORROW X TOGETHER -> 투모로우바이투게더 정답');
assert.equal(matches('투바투', 'TOMORROW X TOGETHER', [], { isArtist: true }), true, 'TOMORROW X TOGETHER -> 투바투 정답');
assert.equal(matches('스키즈', 'Stray Kids', [], { isArtist: true }), true, 'Stray Kids -> 스키즈 정답');
assert.equal(matches('제베원', 'ZEROBASEONE', [], { isArtist: true }), true, 'ZEROBASEONE -> 제베원 정답');
assert.equal(matches('보넥도', 'BOYNEXTDOOR', [], { isArtist: true }), true, 'BOYNEXTDOOR -> 보넥도 정답');
assert.equal(matches('에스지워너비', 'SG Wannabe', [], { isArtist: true }), true, 'SG Wannabe -> 에스지워너비 정답');
assert.equal(matches('윤도현밴드', 'YB', [], { isArtist: true }), true, 'YB -> 윤도현밴드 정답');
assert.equal(matches('윤도현', 'YB', [], { isArtist: true }), true, 'YB -> 윤도현 정답');
assert.equal(matches('백예린', 'Yerin Baek', [], { isArtist: true }), true, 'Yerin Baek -> 백예린 정답');
assert.equal(matches('이승윤', 'Lee Seung Yoon', [], { isArtist: true }), true, 'Lee Seung Yoon -> 이승윤 정답');
assert.equal(matches('성시경', 'Sung Si-kyung', [], { isArtist: true }), true, 'Sung Si-kyung -> 성시경 정답');
assert.equal(matches('김광석', 'Kim Kwang-seok', [], { isArtist: true }), true, 'Kim Kwang-seok -> 김광석 정답');
assert.equal(matches('최예나', 'YENA', [], { isArtist: true }), true, 'YENA -> 최예나 정답');
assert.equal(matches('예나', 'YENA', [], { isArtist: true }), true, 'YENA -> 예나 정답');
assert.equal(matches('지드래곤', 'G-DRAGON', [], { isArtist: true }), true, 'G-DRAGON -> 지드래곤 정답');
assert.equal(matches('지디', 'G-DRAGON', [], { isArtist: true }), true, 'G-DRAGON -> 지디 정답');
assert.equal(matches('권지용', 'G-DRAGON', [], { isArtist: true }), true, 'G-DRAGON -> 권지용 정답');

// 7. 일본 아티스트 한국어 입력 정답 판정 강화 검증 (풀네임, 외래어/통용 표기, 받침 결합, 콜라보)
assert.equal(matches('니시노 카나', '西野カナ', [], { isArtist: true }), true, '西野カナ -> 니시노 카나 정답');
assert.equal(matches('니시노카나', '西野カナ', [], { isArtist: true }), true, '西野カナ -> 니시노카나 정답');
assert.equal(matches('카나', '西野カナ', [], { isArtist: true }), true, '西野カナ -> 카나 정답');
assert.equal(matches('니시노', '西野カナ', [], { isArtist: true }), false, '西野カナ -> 성(니시노)만 입력은 오답');
assert.equal(matches('오오츠카 아이', '大塚愛', [], { isArtist: true }), true, '大塚愛 -> 오오츠카 아이 정답');
assert.equal(matches('오츠카 아이', '大塚愛', [], { isArtist: true }), true, '大塚愛 -> 오츠카 아이(장음 생략) 정답');
assert.equal(matches('오쓰카 아이', '大塚愛', [], { isArtist: true }), true, '大塚愛 -> 오쓰카 아이(외래어 표기) 정답');
assert.equal(matches('타카하시 리에', '高橋李依', [], { isArtist: true }), true, '高橋李依 -> 타카하시 리에 정답');
assert.equal(matches('다카하시 리에', '高橋李依', [], { isArtist: true }), true, '高橋李依 -> 다카하시 리에 정답');
assert.equal(matches('타카하시 리에', 'Takahashi Rie', [], { isArtist: true }), true, 'Takahashi Rie -> 타카하시 리에 정답');
assert.equal(matches('다카하시 리에', 'Rie Takahashi', [], { isArtist: true }), true, 'Rie Takahashi -> 다카하시 리에 정답');
assert.equal(matches('요네즈 겐시', '米津玄師', [], { isArtist: true }), true, '米津玄師 -> 요네즈 겐시(외래어 표기) 정답');
assert.equal(matches('후지이 가제', '藤井風', [], { isArtist: true }), true, '藤井風 -> 후지이 가제(외래어 표기) 정답');
assert.equal(matches('키타니 타츠야', 'キタニタツヤ', [], { isArtist: true }), true, 'キタニタツヤ -> 키타니 타츠야 정답');
assert.equal(matches('기타니 다쓰야', 'キタニタツヤ', [], { isArtist: true }), true, 'キタニタツヤ -> 기타니 다쓰야 정답');
assert.equal(matches('나카시마 미카', '中島美嘉', [], { isArtist: true }), true, '中島美嘉 -> 나카시마 미카 정답');
assert.equal(matches('나카지마 미카', '中島美嘉', [], { isArtist: true }), true, '中島美嘉 -> 나카지마 미카 정답');
assert.equal(matches('히사이시 조', '久石譲', [], { isArtist: true }), true, '久石譲 -> 히사이시 조 정답');
assert.equal(matches('히사이시 죠', '久石譲', [], { isArtist: true }), true, '久石譲 -> 히사이시 죠 정답');
assert.equal(matches('오모리 모토키', '大森元貴', [], { isArtist: true }), true, '大森元貴 -> 오모리 모토키 정답');
assert.equal(matches('오오모리 모토키', '大森元貴', [], { isArtist: true }), true, '大森元貴 -> 오오모리 모토키 정답');
assert.equal(matches('이치죠 리리카', '一条莉々華', [], { isArtist: true }), true, '一条莉々華 -> 이치죠 리리카 정답');
assert.equal(matches('이치조 리리카', '一条莉々華', [], { isArtist: true }), true, '一条莉々華 -> 이치조 리리카 정답');
assert.equal(matches('주우후테이 라덴', '儒烏風亭らでん', [], { isArtist: true }), true, '儒烏風亭らでん -> 주우후테이 라덴 정답');
assert.equal(matches('주후테이 라덴', '儒烏風亭らでん', [], { isArtist: true }), true, '儒烏風亭らでん -> 주후테이 라덴 정답');
assert.equal(matches('아이묭', 'あいみょん', [], { isArtist: true }), true, 'あいみょん -> 아이묭 정답');
assert.equal(matches('아이묜', 'あいみょん', [], { isArtist: true }), true, 'あいみょん -> 아이묜 정답');
assert.equal(matches('유우리', '優里', [], { isArtist: true }), true, '優里 -> 유우리 정답');
assert.equal(matches('유리', '優里', [], { isArtist: true }), true, '優里 -> 유리 정답');
assert.equal(matches('다오코', 'DAOKO × 米津玄師', [], { isArtist: true }), true, 'DAOKO × 米津玄師 -> 다오코 정답');
assert.equal(matches('요네즈 켄시', 'DAOKO × 米津玄師', [], { isArtist: true }), true, 'DAOKO × 米津玄師 -> 요네즈 켄시 정답');

// 8. 플레이리스트 일본/로마자/외래어 노래 발음·번역 및 가수 한국어 입력 정답 판정 검증
// 8-1. 일본어 노래 한국어 발음(음차) 및 공식 번역 입력
assert.equal(matches('사요나라와 이와나이', 'さよならは言わない'), true, 'さよならは言わない -> 발음(사요나라와 이와나이) 정답');
assert.equal(matches('안녕은 말하지 않아', 'さよならは言わない'), true, 'さよならは言わない -> 번역(안녕은 말하지 않아) 정답');
assert.equal(matches('키라이노치스키', 'キライのちスキ！\u00a0'), true, 'キライのちスキ！ -> 발음(키라이노치스키) 정답');
assert.equal(matches('싫어함 뒤 좋아함', 'キライのちスキ！\u00a0'), true, 'キライのちスキ！ -> 번역(싫어함 뒤 좋아함) 정답');
assert.equal(matches('요다카', '夜鷹 - Yodaka'), true, '夜鷹 - Yodaka -> 발음(요다카) 정답');
assert.equal(matches('쏙독새', '夜鷹 - Yodaka'), true, '夜鷹 - Yodaka -> 번역(쏙독새) 정답');
assert.equal(matches('무스비', '結び'), true, '結び -> 발음(무스비) 정답');
assert.equal(matches('매듭', '結び'), true, '結び -> 번역(매듭) 정답');
assert.equal(matches('카라스', '烏 - Raven'), true, '烏 - Raven -> 발음(카라스) 정답');
assert.equal(matches('까마귀', '烏 - Raven'), true, '烏 - Raven -> 번역(까마귀) 정답');
assert.equal(matches('레이븐', '烏 - Raven'), true, '烏 - Raven -> 영문 부제 발음(레이븐) 정답');
assert.equal(matches('치도리', '千鳥'), true, '千鳥 -> 발음(치도리) 정답');
assert.equal(matches('물떼새', '千鳥'), true, '千鳥 -> 번역(물떼새) 정답');
assert.equal(matches('카제니 노루', '風に乗る'), true, '風に乗る -> 발음(카제니 노루) 정답');
assert.equal(matches('바람을 타다', '風に乗る'), true, '風に乗る -> 번역(바람을 타다) 정답');
assert.equal(matches('이토오시이 히비', 'いとおしい日々'), true, 'いとおしい日々 -> 발음(이토오시이 히비) 정답');
assert.equal(matches('사랑스러운 나날', 'いとおしい日々'), true, 'いとおしい日々 -> 번역(사랑스러운 나날) 정답');
assert.equal(matches('쿠라시', '暮らし'), true, '暮らし -> 발음(쿠라시) 정답');
assert.equal(matches('삶', '暮らし'), true, '暮らし -> 번역(삶) 정답');
assert.equal(matches('제로', '零-zero-'), true, '零-zero- -> 제로 정답');
assert.equal(matches('하쿠지츠', '白日'), true, '白日 -> 발음(하쿠지츠) 정답');
assert.equal(matches('백일', '白日'), true, '白日 -> 한자음(백일) 정답');
assert.equal(matches('이치즈', '一途'), true, '一途 -> 발음(이치즈) 정답');
assert.equal(matches('일편단심', '一途'), true, '一途 -> 번역(일편단심) 정답');
assert.equal(matches('사카유메', '逆夢'), true, '逆夢 -> 발음(사카유메) 정답');
assert.equal(matches('역몽', '逆夢'), true, '逆夢 -> 한자음(역몽) 정답');
assert.equal(matches('아오토 나츠', '青と夏'), true, '青と夏 -> 발음(아오토 나츠) 정답');
assert.equal(matches('푸름과 여름', '青と夏'), true, '青と夏 -> 번역(푸름과 여름) 정답');

// 8-2. 가타카나 외래어 노래 제목 -> 한국어 외래어 표기 정답
assert.equal(matches('폴터가이스트', 'ポルターガイスト'), true, 'ポルターガイスト -> 폴터가이스트 정답');
assert.equal(matches('스커트', 'スカート'), true, 'スカート -> 스커트 정답');
assert.equal(matches('싱귤래리티', 'シンギュラリティ'), true, 'シンギュラリティ -> 싱귤래리티 정답');
assert.equal(matches('리컨티뉴', 'リコンティニュー'), true, 'リコンティニュー -> 리컨티뉴 정답');
assert.equal(matches('블루치즈', 'ブルーチーズ'), true, 'ブルーチーズ -> 블루치즈 정답');
assert.equal(matches('하이라이트', 'ハイライト'), true, 'ハイライト -> 하이라이트 정답');
assert.equal(matches('굿타임', 'グッタイム'), true, 'グッタイム -> 굿타임 정답');
assert.equal(matches('팝스', 'ポップス'), true, 'ポップス -> 팝스 정답');

// 8-3. 로마자·영문 노래 제목 -> 한국어 발음 입력 정답
assert.equal(matches('요로시쿠', 'YOROSHIKU!!!'), true, 'YOROSHIKU!!! -> 요로시쿠 정답');
assert.equal(matches('유즈츠', 'Yuzutsu'), true, 'Yuzutsu -> 유즈츠 정답');
assert.equal(matches('하나무시로', 'Hanamushiro'), true, 'Hanamushiro -> 하나무시로 정답');
assert.equal(matches('비바리움', 'Vivarium'), true, 'Vivarium -> 비바리움 정답');
assert.equal(matches('이라나이', 'IRANAI'), true, 'IRANAI -> 이라나이 정답');
assert.equal(matches('루루', 'lulu.'), true, 'lulu. -> 루루 정답');
assert.equal(matches('론도', 'Rondo'), true, 'Rondo -> 론도 정답');
assert.equal(matches('블룸', 'Bloom'), true, 'Bloom -> 블룸 정답');
assert.equal(matches('미싱', 'Missing'), true, 'Missing -> 미싱 정답');
assert.equal(matches('클래식', 'CLASSIC'), true, 'CLASSIC -> 클래식 정답');
assert.equal(matches('라이어', 'Liar'), true, 'Liar -> 라이어 정답');
assert.equal(matches('데스티니 저니스', 'Destiny Journeys'), true, 'Destiny Journeys -> 데스티니 저니스 정답');

// 8-4. 영문/로마자 표기 일본 아티스트 및 밴드 -> 한국어 입력(성 오답, 이름/풀네임 정답)
assert.equal(matches('이마즈 아유무', 'Ayumu Imazu', [], { isArtist: true }), true, 'Ayumu Imazu -> 이마즈 아유무 정답');
assert.equal(matches('아유무', 'Ayumu Imazu', [], { isArtist: true }), true, 'Ayumu Imazu -> 이름(아유무) 정답');
assert.equal(matches('이마즈', 'Ayumu Imazu', [], { isArtist: true }), false, 'Ayumu Imazu -> 성(이마즈)만 입력은 오답');
assert.equal(matches('나카지마 켄토', 'Kento Nakajima', [], { isArtist: true }), true, 'Kento Nakajima -> 나카지마 켄토 정답');
assert.equal(matches('켄토', 'Kento Nakajima', [], { isArtist: true }), true, 'Kento Nakajima -> 이름(켄토) 정답');
assert.equal(matches('나카지마', 'Kento Nakajima', [], { isArtist: true }), false, 'Kento Nakajima -> 성(나카지마)만 입력은 오답');
assert.equal(matches('치바 유키', 'Yuki Chiba', [], { isArtist: true }), true, 'Yuki Chiba -> 치바 유키 정답');
assert.equal(matches('유키', 'Yuki Chiba', [], { isArtist: true }), true, 'Yuki Chiba -> 이름(유키) 정답');
assert.equal(matches('치바', 'Yuki Chiba', [], { isArtist: true }), false, 'Yuki Chiba -> 성(치바)만 입력은 오답');
assert.equal(matches('호시마치 스이세이', 'Hoshimachi Suisei', [], { isArtist: true }), true, 'Hoshimachi Suisei -> 호시마치 스이세이 정답');
assert.equal(matches('스이세이', 'Hoshimachi Suisei', [], { isArtist: true }), true, 'Hoshimachi Suisei -> 이름(스이세이) 정답');
assert.equal(matches('호시마치', 'Hoshimachi Suisei', [], { isArtist: true }), false, 'Hoshimachi Suisei -> 성(호시마치)만 입력은 오답');
assert.equal(matches('아이나 디 엔드', 'AiNA THE END', [], { isArtist: true }), true, 'AiNA THE END -> 아이나 디 엔드 정답');
assert.equal(matches('크리피 너츠', 'Creepy Nuts', [], { isArtist: true }), true, 'Creepy Nuts -> 크리피 너츠 정답');
assert.equal(matches('오피셜히게단디즘', 'Official HIGE DANdism', [], { isArtist: true }), true, 'Official HIGE DANdism -> 오피셜히게단디즘 정답');
assert.equal(matches('히게단', 'Official HIGE DANdism', [], { isArtist: true }), true, 'Official HIGE DANdism -> 약칭(히게단) 정답');
assert.equal(matches('세카이노 오와리', 'SEKAI NO OWARI', [], { isArtist: true }), true, 'SEKAI NO OWARI -> 세카이노 오와리 정답');
assert.equal(matches('수요일의 캄파넬라', 'WEDNESDAY CAMPANELLA', [], { isArtist: true }), true, 'WEDNESDAY CAMPANELLA -> 수요일의 캄파넬라 정답');
assert.equal(matches('사이킥 피버', 'PSYCHIC FEVER from EXILE TRIBE', [], { isArtist: true }), true, 'PSYCHIC FEVER from EXILE TRIBE -> 사이킥 피버 정답');
assert.equal(matches('조지', 'jo0ji', [], { isArtist: true }), true, 'jo0ji -> 조지 정답');
assert.equal(matches('로버트', 'Rol3ert', [], { isArtist: true }), true, 'Rol3ert -> 로버트 정답');

console.log('rules: all assertions passed');


