const form = document.getElementById('search-form');
const queryInput = document.getElementById('query');
const resultsEl = document.getElementById('results');
const statusEl = document.getElementById('status');
const specSection = document.getElementById('spec-section');
const gameTitle = document.getElementById('game-title');
const gameImage = document.getElementById('game-image');
const steamLink = document.getElementById('steam-link');
const minimumEl = document.getElementById('minimum');
const recommendedEl = document.getElementById('recommended');

function showStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.className = isError ? 'status error' : 'status';
}

function stripHtmlTags(value) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchSpecs(appid) {
  showStatus('사양을 불러오는 중...');

  try {
    const response = await fetch(`/api/specs/${appid}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || '사양 조회 실패');
    }

    gameTitle.textContent = `${data.name} (${data.appid})`;
    gameImage.src = data.header_image;
    gameImage.style.display = data.header_image ? 'block' : 'none';
    steamLink.href = data.steam_url;

    minimumEl.textContent = stripHtmlTags(data.minimum);
    recommendedEl.textContent = stripHtmlTags(data.recommended);

    specSection.classList.remove('hidden');
    showStatus('사양 정보를 불러왔습니다.');
  } catch (error) {
    showStatus(error.message, true);
  }
}

function renderResults(results) {
  resultsEl.innerHTML = '';

  if (!results.length) {
    showStatus('검색 결과가 없습니다.', true);
    return;
  }

  showStatus(`총 ${results.length}개의 후보를 찾았습니다.`);

  results.forEach((item) => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${item.name} (${item.appid})`;
    button.className = 'result-item';
    button.addEventListener('click', () => fetchSpecs(item.appid));
    li.appendChild(button);
    resultsEl.appendChild(li);
  });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  specSection.classList.add('hidden');

  const query = queryInput.value.trim();
  if (query.length < 2) {
    showStatus('검색어는 2글자 이상 입력해주세요.', true);
    return;
  }

  showStatus('검색 중...');

  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || '검색 실패');
    }

    renderResults(data.results || []);
  } catch (error) {
    showStatus(error.message, true);
  }
});
