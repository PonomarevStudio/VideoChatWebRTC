// mdc.ripple.MDCRipple.attachTo(document.querySelector('.mdc-button'));

const configuration = {
    iceServers: [
        {
            urls: [
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302',
            ],
        },
    ],
    iceCandidatePoolSize: 10,
};

let peerConnection = null;
let localStream = null;
let remoteStream = null;
let roomDialog = null;
let roomId = null;
let timer = null;
let interval = null;
// const apiUrl = 'http://localhost:3000/api/';
const apiUrl = 'https://chat.queue.dev.ponomarevlad.ru/api/stream/';

if (adapter.browserDetails.browser === 'firefox') {
    adapter.browserShim.shimGetDisplayMedia(window, 'screen');
}

async function connect() {
    console.log('Connect')
    setCompanionUsername();
    // const queue = await fetch(apiUrl + 'get?username=' + auth()).then(_ => _.json()).catch(e => console.error(e) || {room: null});
    return /*queue.room && queue.room.id ? await joinRoomById(queue.room.id, queue.room.username) :*/ await createRoom();
}

async function checkAvailableRooms() {
    console.log('checkAvailableRooms');
    const queue = await fetch(apiUrl + 'get?username=' + auth()).then(_ => _.json()).catch(e => console.error(e) || {room: null});
    return queue.room && queue.room.id ? await reConnect(queue.room) : null;
}

function initCheckInterval() {
    console.log('initCheckInterval');
    return interval = setInterval(checkAvailableRooms, 5000);
}

function removeCheckInterval() {
    console.log('removeCheckInterval');
    return clearInterval(interval);
}

async function reConnect(room = null) {
    console.log('reConnect', room);
    try {
        removeCheckInterval();
        setCompanionUsername();
        deleteTimer('Ищем собеседника ...');
        await hangUp();
        await openUserMedia();
        return /*room ? await joinRoomById(room.id, room.username) :*/ await connect();
    } catch (e) {
        console.error(e);
        return location.reload();
    }
}

function auth(message = 'Введи имя или никнейм') {
    if (!localStorage.getItem('username')) {
        let username = prompt(message);
        if (!username || username.length < 3) return auth('Вы ввели слишком короткий никнейм — Введи имя или никнейм');
        localStorage.setItem('username', username);
    }
    return localStorage.getItem('username');
}

function loadRoomData() {
    if (roomId) return fetch(apiUrl + 'room?id=' + roomId).then(_ => _.json()).then(_ => _.room && _.room.client ? setCompanionUsername(_.room.client) : null);
}

async function init() {
    // document.querySelector('#cameraBtn').addEventListener('click', openUserMedia);
    // document.querySelector('#hangupBtn').addEventListener('click', hangUp);
    // document.querySelector('#createBtn').addEventListener('click', createRoom);
    // document.querySelector('#joinBtn').addEventListener('click', joinRoom);
    // roomDialog = new mdc.dialog.MDCDialog(document.querySelector('#room-dialog'));
    // dragElement(document.getElementById("localVideo"));
    // document.getElementById("localVideo").onleavepictureinpicture = e => e.target.style.opacity = 1;
    // document.getElementById("localVideo").onclick = e => e.target.requestPictureInPicture(e.target.style.opacity = 0);

    document.getElementById('user').innerText = 'Вы зашли как: ' + auth();

    dragNdrop({
        element: document.getElementById("localVideo") // draggable element
    });

    setStatusText('Ищем собеседника ...');
    await openUserMedia();
    return await connect();

}

async function createRoom() {
    // document.querySelector('#createBtn').disabled = true;
    // document.querySelector('#joinBtn').disabled = true;
    const db = firebase.firestore();
    const roomRef = await db.collection('rooms').doc();

    console.log('Create PeerConnection with configuration: ', configuration);
    peerConnection = new RTCPeerConnection(configuration);

    registerPeerConnectionListeners();

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // Code for collecting ICE candidates below
    const callerCandidatesCollection = roomRef.collection('callerCandidates');

    peerConnection.addEventListener('icecandidate', event => {
        if (!event.candidate) {
            console.log('Got final candidate!');
            return;
        }
        // console.log('Got candidate: ', event.candidate);
        callerCandidatesCollection.add(event.candidate.toJSON());
    });
    // Code for collecting ICE candidates above

    // Code for creating a room below
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    console.log('Created offer:', offer);

    const roomWithOffer = {
        'offer': {
            type: offer.type,
            sdp: offer.sdp,
        },
    };
    await roomRef.set(roomWithOffer);
    roomId = roomRef.id;
    console.log(`New room created with SDP offer. Room ID: ${roomRef.id}`);
    // document.querySelector('#currentRoom').innerText = `Current room is ${roomRef.id} - You are the caller!`;
    /*fetch(apiUrl + 'insert?id=' + roomId + '&username=' + auth()).then(_ => _.json())
        .then(insert => insert.status && insert.status.id ? reConnect() : true);*/

    document.getElementById('timer').value = 'https://ps-webrtc.web.app/stream.html?room=' + roomId;
    // initCheckInterval();
    // Code for creating a room above

    peerConnection.addEventListener('track', event => {
        console.log('Got remote track:', event.streams[0]);
        event.streams[0].getTracks().forEach(track => {
            // console.log('Add a track to the remoteStream:', track);
            remoteStream.addTrack(track);
        });
    });

    // Listening for remote session description below
    roomRef.onSnapshot(async snapshot => {
        const data = snapshot.data();
        if (!peerConnection.currentRemoteDescription && data && data.answer) {
            console.log('Got remote description: ', data.answer);
            const rtcSessionDescription = new RTCSessionDescription(data.answer);
            await peerConnection.setRemoteDescription(rtcSessionDescription);
        }
    });
    // Listening for remote session description above

    // Listen for remote ICE candidates below
    roomRef.collection('calleeCandidates').onSnapshot(snapshot => {
        snapshot.docChanges().forEach(async change => {
            if (change.type === 'added') {
                let data = change.doc.data();
                // console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
                await peerConnection.addIceCandidate(new RTCIceCandidate(data));
            }
        });
    });
    // Listen for remote ICE candidates above
}

async function joinRoom() {


    // document.querySelector('#confirmJoinBtn').
    //     addEventListener('click', async () => {
    roomId = prompt('Enter ID for room to join:');//document.querySelector('#room-id').value;
    if (!roomId) return;

    // document.querySelector('#createBtn').disabled = true;
    // document.querySelector('#joinBtn').disabled = true;

    console.log('Join room: ', roomId);
    // document.querySelector('#currentRoom').innerText = `Current room is ${roomId} - You are the callee!`;
    // await joinRoomById(roomId);
    // }, {once: true});
    // roomDialog.open();
}

async function joinRoomById(roomId, username = null) {
    const db = firebase.firestore();
    const roomRef = db.collection('rooms').doc(`${roomId}`);
    const roomSnapshot = await roomRef.get();
    console.log('Got room:', roomSnapshot.exists);
    fetch(apiUrl + 'remove?id=' + roomId + '&username=' + auth());

    if (roomSnapshot.exists) {
        setCompanionUsername(username);
        console.log('Create PeerConnection with configuration: ', configuration);
        peerConnection = new RTCPeerConnection(configuration);
        registerPeerConnectionListeners();
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Code for collecting ICE candidates below
        const calleeCandidatesCollection = roomRef.collection('calleeCandidates');
        peerConnection.addEventListener('icecandidate', event => {
            if (!event.candidate) {
                console.log('Got final candidate!');
                return;
            }
            // console.log('Got candidate: ', event.candidate);
            calleeCandidatesCollection.add(event.candidate.toJSON());
        });
        // Code for collecting ICE candidates above

        peerConnection.addEventListener('track', event => {
            console.log('Got remote track:', event.streams[0]);
            event.streams[0].getTracks().forEach(track => {
                // console.log('Add a track to the remoteStream:', track);
                remoteStream.addTrack(track);
            });
        });

        // Code for creating SDP answer below
        const offer = roomSnapshot.data().offer;
        console.log('Got offer:', offer);
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        console.log('Created answer:', answer);
        await peerConnection.setLocalDescription(answer);

        const roomWithAnswer = {
            answer: {
                type: answer.type,
                sdp: answer.sdp,
            },
        };
        await roomRef.update(roomWithAnswer);
        // Code for creating SDP answer above

        // Listening for remote ICE candidates below
        roomRef.collection('callerCandidates').onSnapshot(snapshot => {
            snapshot.docChanges().forEach(async change => {
                if (change.type === 'added') {
                    let data = change.doc.data();
                    // console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
                    await peerConnection.addIceCandidate(new RTCIceCandidate(data));
                }
            });
        });
        // Listening for remote ICE candidates above
    } else return await reConnect()
}

async function openUserMedia(e) {
    const stream = await navigator.mediaDevices.getDisplayMedia({video: true, audio: true});
    document.querySelector('#localVideo').srcObject = stream;
    localStream = stream;
    remoteStream = new MediaStream();
    document.querySelector('#remoteVideo').srcObject = remoteStream;

    console.log('Stream:', document.querySelector('#localVideo').srcObject);
    // document.querySelector('#cameraBtn').disabled = true;
    // document.querySelector('#joinBtn').disabled = false;
    // document.querySelector('#createBtn').disabled = false;
    // document.querySelector('#hangupBtn').disabled = false;
}

async function hangUp(e) {
    const tracks = document.querySelector('#localVideo').srcObject.getTracks();
    tracks.forEach(track => {
        track.stop();
    });

    if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
    }

    if (peerConnection) {
        peerConnection.close();
    }

    document.querySelector('#localVideo').srcObject = null;
    document.querySelector('#remoteVideo').srcObject = null;
    // document.querySelector('#cameraBtn').disabled = false;
    // document.querySelector('#joinBtn').disabled = true;
    // document.querySelector('#createBtn').disabled = true;
    // document.querySelector('#hangupBtn').disabled = true;
    // document.querySelector('#currentRoom').innerText = '';

    // Delete room on hangup
    if (roomId) {
        const db = firebase.firestore();
        const roomRef = db.collection('rooms').doc(roomId);
        const calleeCandidates = await roomRef.collection('calleeCandidates').get();
        calleeCandidates.forEach(async candidate => {
            await candidate.ref.delete();
        });
        const callerCandidates = await roomRef.collection('callerCandidates').get();
        callerCandidates.forEach(async candidate => {
            await candidate.ref.delete();
        });
        await roomRef.delete();
    }

    // document.location.reload(true);
}

function registerPeerConnectionListeners() {
    peerConnection.addEventListener('icegatheringstatechange', () => {
        console.log(
            `ICE gathering state changed: ${peerConnection.iceGatheringState}`);
        switch (peerConnection.iceGatheringState) {
            case "new":
            case "complete":
                removeCheckInterval();
                return loadRoomData();
        }
    });

    peerConnection.addEventListener('connectionstatechange', () => {
        console.log(`Connection state change: ${peerConnection.connectionState}`);
        switch (peerConnection.connectionState) {
            case "connected":
                removeCheckInterval();
                // startTimer();
                return loadRoomData();
            case "connecting":
                return deleteTimer('Ищем собеседника ...');
            case "disconnected":
            case "failed":
                return reConnect()
        }
    });

    peerConnection.addEventListener('signalingstatechange', () => {
        console.log(`Signaling state change: ${peerConnection.signalingState}`);
    });

    peerConnection.addEventListener('iceconnectionstatechange ', () => {
        console.log(
            `ICE connection state change: ${peerConnection.iceConnectionState}`);
    });
}

function startTimer() {
    let time = 60;
    // document.getElementById('timer').classList.toggle('hide', false);
    return timer = setInterval(() => time <= 0 ? reConnect() :
        document.getElementById('timer').innerText = `Время: ${--time}`, 1000)
}

function deleteTimer(text = '') {
    // document.getElementById('timer').classList.toggle('true', false);
    // clearInterval(timer);
    return setStatusText(text);
}

function setStatusText(text) {
    // return document.getElementById('timer').innerText = text;
}

function setCompanionUsername(username = null) {
    return document.getElementById('companion').innerText = username ? `Ваш собеседник: ${username}` : '';
}

function feedback() {
    let message = prompt('Опишите проблему');
    let _navigator = {};
    for (let i in navigator) _navigator[i] = navigator[i];
    navigator.sendBeacon(apiUrl + 'feedback', JSON.stringify({username: auth(), message, navigator: _navigator}));
    return alert('Информация отправлена !');
}

// init();

document.body.addEventListener('touchmove', function (event) {
    event.preventDefault();
}, false);
