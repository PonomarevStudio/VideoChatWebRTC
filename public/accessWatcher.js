window.addEventListener('load', () => {
    window.access = localStorage.getItem('access') ? JSON.parse(localStorage.getItem('access')) : null;
    window.watch = setInterval(updateAccess, 15000);
    return updateAccess();
});

async function updateAccess() {
    const response = await fetch('https://chat.queue.dev.ponomarevlad.ru/api/access');
    const data = await response.json();
    console.debug(data.access);
    localStorage.setItem('access', JSON.stringify(data.access));
    switch (location.host) {
        case 'xn--90ajddc2awbx3g.xn--p1ai':
            if (data.access.version && access && access.version) {
                if (data.access.version > access.version) return location.reload();
            }
            handleVideoChatLink(data.access);
            break;
        case 'ps-webrtc.web.app':
            handleVideoChat(data.access);
            break;
    }
}

function handleVideoChatLink(data) {
    const link = window.videochatLink || document.querySelector(`a[href*="ps-webrtc.web.app"]`);
    if (!link) return;
    window.videochatLink = link;
    if (data.videochatActive) {
        if (data.videochatUrl) link.href = data.videochatUrl;
        link.title = 'Присоединяйся к чат-рулетке для общения с коллегами';
        link.querySelector('span').innerText = 'Войти в чат-рулетку';
        link.querySelector('div').style.cursor = 'pointer';
    } else {
        link.removeAttribute('href');
        link.title = 'Скоро вы сможете войти в чат-рулетку';
        link.querySelector('span').innerText = 'Скоро вы сможете войти в чат-рулетку';
        link.querySelector('div').style.cursor = 'not-allowed';
    }
}

function handleVideoChat(data) {
    if (!data.videochatActive) {
        alert('Скоро вы сможете войти в чат-рулетку, а пока возвращайтесь к нашей трансляции');
        window.close();
        location.href = 'https://жизньубрир.рф';
    }
}
