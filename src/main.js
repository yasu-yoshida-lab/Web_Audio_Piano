﻿// 変数宣言
const keyMap = [
    { pcKey: "a", pianoKey: 0 },
    { pcKey: "w", pianoKey: 1 },
    { pcKey: "s", pianoKey: 2 },
    { pcKey: "e", pianoKey: 3 },
    { pcKey: "d", pianoKey: 4 },
    { pcKey: "f", pianoKey: 5 },
    { pcKey: "u", pianoKey: 6 },
    { pcKey: "j", pianoKey: 7 },
    { pcKey: "i", pianoKey: 8 },
    { pcKey: "k", pianoKey: 9 },
    { pcKey: "o", pianoKey: 10 },
    { pcKey: "l", pianoKey: 11 },
    { pcKey: ";", pianoKey: 12 }
]                                   // PCキーとピアノ鍵盤番号の紐づけ
const numkey = 20
const pianoSounds = []              // Audioオブジェクト        
const touchKeyNumlist = []          // タッチ中の鍵盤番号リスト
let clickedKeyNum = null            // クリック中の鍵盤番号リスト
const isKeyPressing = new Array(numkey) // ピアノ鍵盤ごとの押下状態
isKeyPressing.fill(false)           // 初期値 = false            
const intervalIds = new Array(numkey)   // 各オーディオフェードアウトのインターバルID
intervalIds.fill(null)              // 初期値 = null
const pianoWrap = document.getElementById("piano-wrap")     // 鍵盤全体
const whiteKeys = document.querySelectorAll(".white-key")   // 白鍵
const blackKeys = document.querySelectorAll(".black-key")   // 黒鍵
const audioctxes = new Array(numkey);
audioctxes.fill(null);
const oscillators = new Array(numkey);
oscillators.fill(null);
const gains = new Array(numkey);
gains.fill(null);
let frequencies = [
    261.63, // ド
    277.18, // ド# (C#)
    293.66, // レ
    311.13, // レ# (D#)
    329.63, // ミ
    349.23, // ファ
    369.99, // ファ# (F#)
    392.00, // ソ
    415.30, // ソ# (G#)
    440.00, // ラ
    466.16, // ラ# (A#)
    493.88, // シ
    523.25  // 1オクターブ上のC（ド）
];

for (let i = 0; i < numkey; i++) { 
    audioctxes[i] = new AudioContext();
}

// タッチ対応判定
if (window.ontouchstart === null) {
    // タッチ対応：タッチイベントのリスナーをセット
    pianoWrap.addEventListener("touchstart", function(){ handleTouchEvents(event) })
    pianoWrap.addEventListener("touchmove", function(){ handleTouchEvents(event) })
    pianoWrap.addEventListener("touchend", function(){ handleTouchEvents(event) })
    pianoWrap.addEventListener("touchcancel", function(){ handleTouchEvents(event) }) 
} else {
    // タッチ非対応：マウスイベントのリスナーをセット
    pianoWrap.addEventListener("mousedown", function(){ handleMouseEvents(event) })
    pianoWrap.addEventListener("mouseup", function(){ handleMouseEvents(event) })
    window.addEventListener("mousemove", function(){ handleMouseEvents(event) })
} 

// 座標(x,y)に応じた鍵盤番号を取得
function getKeyNum(x, y){
    // 黒鍵とタッチ箇所が重なるかチェック
    for ( let j = 0; j < blackKeys.length; j++ ){
        const KeyRect = blackKeys[j].getBoundingClientRect()
        if ( x >= window.pageXOffset + KeyRect.left  &&
             x <= window.pageXOffset + KeyRect.right &&
             y >= window.pageYOffset + KeyRect.top   &&
             y <= window.pageYOffset + KeyRect.bottom ){
            // タッチした鍵盤番号をセット
            return Number( blackKeys[j].dataset.keyNum )
        }
    } 
    // 白鍵とタッチ箇所が重なるかチェック
    for ( let j = 0; j < whiteKeys.length; j++ ){
        const KeyRect = whiteKeys[j].getBoundingClientRect()
        if ( x >= window.pageXOffset + KeyRect.left  &&
             x <= window.pageXOffset + KeyRect.right &&
             y >= window.pageYOffset + KeyRect.top   &&
             y <= window.pageYOffset + KeyRect.bottom ){
            // タッチした鍵盤番号をセット
            return Number( whiteKeys[j].dataset.keyNum )
        }
    }
    // ピアノ外のタッチの場合
    return null
}

// タッチイベント発生時の処理
function handleTouchEvents(event){
    if (typeof event.cancelable !== 'boolean' || event.cancelable) {
        event.preventDefault();
    }
    const BeforeKeyNumlist = JSON.parse(JSON.stringify(touchKeyNumlist)) 
    touchKeyNumlist.length = 0
    // 各接触ポイントから押下中の鍵盤番号リストを作成
    for ( let i = 0; i < event.touches.length; i++ ){
        const x = event.touches[i].pageX 
        const y = event.touches[i].pageY 
        let keyNum = getKeyNum(x, y)
        if ( keyNum !== null ){
            if ( !touchKeyNumlist.includes(keyNum) ){
                // リストに存在しなければ鍵盤番号をセット
                touchKeyNumlist.push(keyNum)
            }
        }
    } 
    // 新リストのみに存在 => 鍵盤を押下した処理
    for ( let i = 0; i < touchKeyNumlist.length; i++ ){
        if ( !BeforeKeyNumlist.includes(touchKeyNumlist[i]) ){ 
            pressPianoKey(touchKeyNumlist[i]) 
        }
    }
    // 旧リストのみに存在 => 鍵盤をはなした処理
    for ( let i = 0; i < BeforeKeyNumlist.length; i++ ){
        if ( !touchKeyNumlist.includes(BeforeKeyNumlist[i]) ){
            releasePianoKey(BeforeKeyNumlist[i]) 
        }
    }
}

// マウスイベント発生時の処理
function handleMouseEvents(event){
    // 左クリック以外は対象外
    if ( event.which !== 1 ){ return }
    const x = event.pageX 
    const y = event.pageY 
    let keyNum
    switch ( event.type ){
        case "mousedown":
            keyNum = getKeyNum(x, y)
            if ( keyNum !== null ){ pressPianoKey(keyNum) }
            clickedKeyNum = keyNum
            break
        case "mouseup":
            if ( clickedKeyNum !== null ){
                keyNum = getKeyNum(x, y)
                if ( keyNum !== null ){ releasePianoKey(keyNum) }
                clickedKeyNum = null
            }
            break
        case "mousemove":
            keyNum = getKeyNum(x, y)
            if ( keyNum !== null ){
                // マウスポインタ位置が直前の鍵盤以外の鍵盤上の場合
                if ( keyNum !== clickedKeyNum ){ 
                    releasePianoKey(clickedKeyNum)
                    pressPianoKey(keyNum) 
                    clickedKeyNum = keyNum
                }
            } else {
                // マウスポインタ位置が鍵盤外の場合
                releasePianoKey(clickedKeyNum)
                clickedKeyNum = null
            }
            break
    }
}

// PCkeydown時の処理
document.onkeydown = function(event) {
    // 鍵盤番号を取得
    const obj = keyMap.find( (item) => item.pcKey === event.key )
    if ( typeof obj !== "undefined" ){
        // keyMapに含まれるキーの場合は後続処理実行
        pressPianoKey(obj.pianoKey)
    } 
}

// PCkeyup時の処理
document.onkeyup = function(event) {
    // 鍵盤番号を取得
    const obj = keyMap.find( (item) => item.pcKey === event.key )
    if ( typeof obj !== "undefined" ){
        // keyMapに含まれるキーの場合は後続処理実行
        releasePianoKey(obj.pianoKey)
    } 
}

// ピアノ鍵盤を押下した時の処理
function pressPianoKey(keyNum){
    if ( !isKeyPressing[keyNum] ){
        // 鍵盤を離している場合のみ続行(長押しによる連打防止)
        isKeyPressing[keyNum] = true
        document.querySelector(`[data-key-num="${keyNum}"]`).classList.add("pressing")
        soundPlay(keyNum)
    }
}

// ピアノ鍵盤をはなした時の処理
function releasePianoKey(keyNum){
    if ( isKeyPressing[keyNum] ){
        // 鍵盤を押している場合のみ続行
        isKeyPressing[keyNum] = false
        document.querySelector(`[data-key-num="${keyNum}"]`).classList.remove("pressing")
        soundStop(keyNum)
    }
}

// オーディオ再生
function soundPlay(soundNum) {
    clearInterval( intervalIds[soundNum] )
    if(oscillators[soundNum] == null) {
        const start_time = audioctxes[soundNum].currentTime + 0.01; // 0.1秒後に停止予定
        oscillators[soundNum] = audioctxes[soundNum].createOscillator();
        gains[soundNum] = new GainNode(audioctxes[soundNum]);
        oscillators[soundNum].type = "sine";
        gains[soundNum].gain.volume = 0.2;
        oscillators[soundNum].frequency.setValueAtTime(frequencies[soundNum], audioctxes[soundNum].currentTime);
        gains[soundNum].gain.setValueAtTime(0, start_time - 0.01);
        gains[soundNum].gain.linearRampToValueAtTime(gains[soundNum].gain.volume, start_time);
        oscillators[soundNum].connect(gains[soundNum]).connect(audioctxes[soundNum].destination);
        oscillators[soundNum].start(start_time);
    }
}

// オーディオ停止(フェードアウト)
function soundStop(soundNum) {  
    if (oscillators[soundNum]) { 
        const stop_time = audioctxes[soundNum].currentTime + 0.1; // 0.1秒後に停止予定
        gains[soundNum].gain.setValueAtTime(gains[soundNum].gain.volume , stop_time - 0.3);
        gains[soundNum].gain.linearRampToValueAtTime(0, stop_time);
        oscillators[soundNum].stop(stop_time + 0.1);
        oscillators[soundNum] = null;
    }
}