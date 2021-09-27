window.addEventListener('load', () => {
    window.access = localStorage.getItem('access') ? JSON.parse(localStorage.getItem('access')) : null;
    window.watch = setInterval(updateAccess, 15000);
    return updateAccess();
});

async function updateAccess() {
    const response = await fetch('https://chat.queue.dev.ponomarevlad.ru/api/access');
    const data = await response.json();
    console.debug('xn--90ajddc2awbx3g.xn--p1ai', location.host, location.host === 'xn--90ajddc2awbx3g.xn--p1ai', data.access);
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
    if (data.videochat) {
        link.href = data.videochat;
        link.innerText = 'Присоединяйся к чат-рулетке для общения с коллегами ➜';
        link.style.pointerEvents = 'initial';
    } else {
        link.href = '';
        link.innerText = 'Скоро вы сможете войти в чат-рулетку';
        link.style.pointerEvents = 'none';
    }
}

function handleVideoChat(data) {
    if (data.videochatEnd) {
        alert('Скоро вы сможете войти в чат-рулетку, а пока возвращайтесь к нашей трансляции');
        window.close();
        location.href = 'https://жизньубрир.рф';
    }
}
