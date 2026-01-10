const setupCurrentTime = () => {
  const timeElement = document.getElementById('current-time');

  if (!timeElement) {
    return;
  }

  const formatTime = (date) => {
    return date.toLocaleString('es-ES', {
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(/^./, (char) => char.toUpperCase());
  };

  const updateTime = () => {
    const now = new Date();
    timeElement.textContent = formatTime(now);
  };

  updateTime();
  setInterval(updateTime, 1000 * 60);
};

const setupAdRails = () => {
  const mainHeader = document.querySelector('.main-header');
  const contentWrapper = document.querySelector('.content-wrapper');

  if (!mainHeader || !contentWrapper) {
    return;
  }

  const cebollaCampaign = {
    id: 'cebolla-viva',
    badge: 'Receta de la casa',
    title: 'Elixir de Cebolla Viva',
    subtitle: 'Bébelo directo o aporta un toque dulce a tus recetas caseras.',
    features: [
      { icon: '🧅', text: 'Cebollas orgánicas prensadas en frío' },
      { icon: '✨', text: 'Fermentación suave para un dulzor natural' },
      { icon: '🍲', text: 'Equilibra sopas, arroces y salsas en segundos' }
    ],
    usageTitle: 'Dos formas de disfrutarla',
    usage: [
      'Sírvela fría directamente del envase para un impulso vegetal revitalizante.',
      'Añade un chorrito al cocinar sofritos, guisos o marinados para potenciar el sabor.'
    ],
    notes: 'Sin azúcares añadidos ni conservantes. Mantener refrigerado una vez abierto.',
    footnote: 'Producto ficticio creado para la demostración del banner publicitario.',
    cta: 'Descubre la mezcla base',
    gradient: 'linear-gradient(205deg, #0f6d2a 0%, #1aa44d 55%, #6fe59b 100%)',
    accent: 'rgba(255, 255, 255, 0.18)',
    highlight: 'rgba(255, 255, 255, 0.9)'
  };

  const body = document.body;
  if (body.classList.contains('has-ad-rails')) {
    return;
  }

  const selectedCampaign = cebollaCampaign;

  body.classList.add('has-ad-rails');

  const pageShell = document.createElement('div');
  pageShell.className = 'page-shell';

  const nodesToMove = Array.from(body.children).filter((child) => !child.classList.contains('ad-rail'));
  nodesToMove.forEach((child) => {
    pageShell.appendChild(child);
  });

  body.appendChild(pageShell);

  const createFeatureList = (features) => {
    if (!features?.length) {
      return null;
    }

    const list = document.createElement('ul');
    list.className = 'ad-card__feature-list';

    features.forEach((feature) => {
      const icon = document.createElement('i');
      icon.textContent = feature.icon ?? '•';

      const item = document.createElement('li');
      item.className = 'ad-card__feature';
      const text = document.createElement('span');
      text.textContent = feature.text ?? feature;

      item.appendChild(icon);
      item.appendChild(text);
      list.appendChild(item);
    });

    return list;
  };

  const createUsageBlock = (title, items) => {
    if (!items?.length) {
      return null;
    }

    const usageWrapper = document.createElement('div');
    usageWrapper.className = 'ad-card__usage';

    if (title) {
      const usageTitle = document.createElement('h4');
      usageTitle.className = 'ad-card__usage-title';
      usageTitle.textContent = title;
      usageWrapper.appendChild(usageTitle);
    }

    const usageList = document.createElement('ul');
    usageList.className = 'ad-card__usage-list';

    items.forEach((usage) => {
      const usageItem = document.createElement('li');
      usageItem.textContent = usage;
      usageList.appendChild(usageItem);
    });

    usageWrapper.appendChild(usageList);

    return usageWrapper;
  };

  const createAdCard = (campaign) => {
    const card = document.createElement('article');
    card.className = `ad-card ad-card--${campaign.id}`;
    card.style.setProperty('--ad-gradient', campaign.gradient);
    card.style.setProperty('--ad-accent', campaign.accent);
    card.style.setProperty('--ad-highlight', campaign.highlight);

    const badge = document.createElement('span');
    badge.className = 'ad-card__badge';
    badge.textContent = campaign.badge;

    const title = document.createElement('h3');
    title.className = 'ad-card__title';
    title.textContent = campaign.title;

    const subtitle = document.createElement('p');
    subtitle.className = 'ad-card__subtitle';
    subtitle.textContent = campaign.subtitle;

    const bottle = document.createElement('div');
    bottle.className = 'ad-card__bottle';

    const bottleCap = document.createElement('span');
    bottleCap.className = 'ad-card__bottle-cap';

    const bottleNeck = document.createElement('span');
    bottleNeck.className = 'ad-card__bottle-neck';

    const bottleLabel = document.createElement('span');
    bottleLabel.className = 'ad-card__bottle-label';
    bottleLabel.innerHTML = '<span>Cebolla</span><span>Viva</span>';

    bottle.appendChild(bottleCap);
    bottle.appendChild(bottleNeck);
    bottle.appendChild(bottleLabel);

    const features = createFeatureList(campaign.features);

    const usage = createUsageBlock(campaign.usageTitle, campaign.usage);

    const notes = document.createElement('p');
    notes.className = 'ad-card__notes';
    notes.textContent = campaign.notes;

    const cta = document.createElement('a');
    cta.className = 'ad-card__cta';
    cta.href = '#';
    cta.innerHTML = `<span>${campaign.cta}</span><span class="ad-card__cta-icon">→</span>`;
    cta.setAttribute('role', 'button');
    cta.setAttribute('aria-label', `${campaign.cta} - ${campaign.title}`);

    const footnote = document.createElement('p');
    footnote.className = 'ad-card__footnote';
    footnote.textContent = campaign.footnote;

    card.appendChild(badge);
    card.appendChild(title);
    card.appendChild(subtitle);
    card.appendChild(bottle);

    if (features) {
      card.appendChild(features);
    }

    if (usage) {
      card.appendChild(usage);
    }

    card.appendChild(notes);
    card.appendChild(cta);
    card.appendChild(footnote);

    return card;
  };

  const createAdRail = (side) => {
    const adRail = document.createElement('aside');
    adRail.className = `ad-rail ad-rail--${side}`;
    adRail.setAttribute('aria-label', 'Publicidad lateral');

    const adCard = createAdCard(selectedCampaign);
    adRail.appendChild(adCard);

    return adRail;
  };

  const leftAd = createAdRail('left');
  const rightAd = createAdRail('right');

  body.insertBefore(leftAd, pageShell);
  body.appendChild(rightAd);
};

document.addEventListener('DOMContentLoaded', () => {
  setupCurrentTime();
  setupAdRails();
});
