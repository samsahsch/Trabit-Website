(function () {
    var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- 1. Swipeable phone synced with the tab bar ---------- */
    var screens = document.getElementById('screens');
    var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
    var caption = document.getElementById('caption');
    var active = 0;

    function setActive(i) {
        if (i === active) return;
        active = i;
        tabs.forEach(function (t, n) {
            t.setAttribute('aria-selected', n === i ? 'true' : 'false');
            t.tabIndex = n === i ? 0 : -1;
        });
        var parts = tabs[i].dataset.caption.split('|');
        caption.innerHTML = '';
        var strong = document.createElement('strong');
        strong.textContent = parts[0];
        caption.appendChild(strong);
        caption.appendChild(document.createTextNode(parts[1]));
    }

    function goTo(i) {
        screens.scrollTo({ left: i * screens.clientWidth, behavior: reduceMotion ? 'auto' : 'smooth' });
        setActive(i);
    }

    tabs.forEach(function (tab, i) {
        tab.addEventListener('click', function () { goTo(i); });
        tab.addEventListener('keydown', function (e) {
            var next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null;
            if (next === null) return;
            next = (next + tabs.length) % tabs.length;
            goTo(next);
            tabs[next].focus();
            e.preventDefault();
        });
    });

    // Mouse drag. Touch and trackpads already scroll natively; a mouse cannot, so drag it by hand.
    var drag = null;
    screens.addEventListener('dragstart', function (e) { e.preventDefault(); });
    screens.addEventListener('pointerdown', function (e) {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        drag = { x: e.clientX, left: screens.scrollLeft };
        screens.setPointerCapture(e.pointerId);
        screens.classList.add('dragging');
    });
    screens.addEventListener('pointermove', function (e) {
        if (drag) screens.scrollLeft = drag.left - (e.clientX - drag.x);
    });
    function endDrag(e) {
        if (!drag) return;
        var dx = e.clientX - drag.x;
        var threshold = screens.clientWidth * 0.12;
        var target = dx < -threshold ? Math.min(active + 1, tabs.length - 1)
                   : dx > threshold ? Math.max(active - 1, 0)
                   : active;
        drag = null;
        screens.classList.remove('dragging');
        goTo(target);
    }
    screens.addEventListener('pointerup', endDrag);
    screens.addEventListener('pointercancel', endDrag);

    var scrollTimer;
    screens.addEventListener('scroll', function () {
        if (drag) return;
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(function () {
            setActive(Math.round(screens.scrollLeft / screens.clientWidth));
        }, 60);
    }, { passive: true });

    // Keep the current screen in view when the phone changes size (rotation, window resize).
    window.addEventListener('resize', function () { screens.scrollLeft = active * screens.clientWidth; });

    screens.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' && active < tabs.length - 1) { goTo(active + 1); e.preventDefault(); }
        if (e.key === 'ArrowLeft' && active > 0) { goTo(active - 1); e.preventDefault(); }
    });

    /* ---------- 2. "Just say it" demo parser ---------- */
    // Understands the way people jot things down: an activity in any words, plus an amount in any order.
    // "pickleball 1hr", "ran 1h30", "20 min violin", "3 glasses of water", "8k steps". The app uses Apple Intelligence.

    // Activities: [pattern, name, emoji, kind]. kind "dist" means a bare "m" after a number is metres, not minutes.
    var ACTIVITIES = [
        ['table tennis|ping ?pong', 'Table tennis', '🏓'],
        ['pi(?:ck|c|k)le ?ball', 'Pickleball', '🏓'],
        ['walk(?:ed|ing)? the dog|dog walk', 'Dog walk', '🐕', 'dist'],
        ['brush(?:ed)? (?:my )?teeth', 'Brush teeth', '🪥'],
        ['american football', 'American football', '🏈'],
        ['push ?-?ups?', 'Pushups', '💪'],
        ['pull ?-?ups?|chin ?-?ups?', 'Pull-ups', '💪'],
        ['sit ?-?ups?|crunch(?:es)?', 'Sit-ups', '💪'],
        ['squats?', 'Squats', '🏋️'],
        ['burpees?', 'Burpees', '🔥'],
        ['planks?(?:ed|ing)?', 'Plank', '🧘'],
        ['jump(?:ed|ing)? rope|skipping', 'Jump rope', '🪢'],
        ['half marathon|marathon|ran|runs?|running|jog(?:ged|ging)?|sprints?', 'Running', '🏃', 'dist'],
        ['walk(?:ed|ing|s)?|stroll', 'Walking', '🚶', 'dist'],
        ['hik(?:e|ed|ing)', 'Hiking', '🥾', 'dist'],
        ['swim(?:ming)?|swam|laps', 'Swimming', '🏊', 'dist'],
        ['bik(?:e|ed|ing)|cycl(?:e|ed|ing)|rode|ride|spin(?:ning)? class|peloton', 'Cycling', '🚴', 'dist'],
        ['rowed|rowing|rower|erg', 'Rowing', '🚣', 'dist'],
        ['kayak(?:ed|ing)?|canoe(?:ing)?|paddl(?:e|ed|ing)', 'Paddling', '🛶', 'dist'],
        ['padel', 'Padel', '🎾'],
        ['tennis', 'Tennis', '🎾'],
        ['badminton', 'Badminton', '🏸'],
        ['squash', 'Squash', '🎾'],
        ['basketball|hoops', 'Basketball', '🏀'],
        ['soccer|football|futsal', 'Football', '⚽'],
        ['volleyball', 'Volleyball', '🏐'],
        ['baseball|softball', 'Baseball', '⚾'],
        ['hockey', 'Hockey', '🏒'],
        ['rugby', 'Rugby', '🏉'],
        ['golf(?:ed|ing)?', 'Golf', '⛳'],
        ['ski(?:ed|ing)?', 'Skiing', '⛷️'],
        ['snowboard(?:ed|ing)?', 'Snowboarding', '🏂'],
        ['surf(?:ed|ing)?', 'Surfing', '🏄'],
        ['climb(?:ed|ing)?|boulder(?:ed|ing)?', 'Climbing', '🧗'],
        ['skat(?:e|ed|ing)', 'Skating', '⛸️'],
        ['box(?:ed|ing)?|kickboxing|sparr(?:ed|ing)', 'Boxing', '🥊'],
        ['karate|judo|jiu ?jitsu|bjj|taekwondo|martial arts|mma', 'Martial arts', '🥋'],
        ['horse ?-?riding|horseback|equestrian|dressage|show ?jumping|rode (?:my|the) horse', 'Horse riding', '🏇'],
        ['salsa|bachata|tango|kizomba|swing dancing|hip ?hop|danc(?:e|ed|ing)|zumba|ballet', 'Dancing', '💃'],
        ['archery', 'Archery', '🏹'],
        ['fencing', 'Fencing', '🤺'],
        ['gymnastics|trampoline|parkour|calisthenics', 'Gymnastics', '🤸'],
        ['handball', 'Handball', '🤾'],
        ['cricket', 'Cricket', '🏏'],
        ['lacrosse', 'Lacrosse', '🥍'],
        ['frisbee|ultimate', 'Frisbee', '🥏'],
        ['sail(?:ed|ing)?', 'Sailing', '⛵'],
        ['kite ?surf(?:ed|ing)?|wind ?surf(?:ed|ing)?|wing ?foil(?:ing)?', 'Kitesurfing', '🪁'],
        ['scuba|div(?:e|ed|ing)|snorkel(?:ed|ing|ling)?|freediving', 'Diving', '🤿'],
        ['fish(?:ed|ing)', 'Fishing', '🎣'],
        ['chess', 'Chess', '♟️'],
        ['triathlon|duathlon|brick', 'Triathlon', '🏅', 'dist'],
        ['table ?top|board ?games?', 'Board games', '🎲'],
        ['bowling', 'Bowling', '🎳'],
        ['wrestl(?:e|ed|ing)', 'Wrestling', '🤼'],
        ['ice skat(?:e|ed|ing)', 'Skating', '⛸️'],
        ['yoga', 'Yoga', '🧘'],
        ['pilates', 'Pilates', '🧘'],
        ['stretch(?:ed|ing)?|mobility|foam roll(?:ed|ing)?', 'Stretching', '🤸'],
        ['meditat(?:e|ed|ion|ing)|breathwork', 'Meditate', '🧘'],
        ['gym|lift(?:ed|ing)?|weights|strength|workout|work(?:ed)? out|crossfit|hiit', 'Strength', '🏋️'],
        ['violin|fiddle', 'Violin', '🎻'],
        ['viola|cello|double bass', 'Strings', '🎻'],
        ['piano|keyboard', 'Piano', '🎹'],
        ['guitar|bass guitar|ukulele', 'Guitar', '🎸'],
        ['drums?|drumming|percussion', 'Drums', '🥁'],
        ['sax(?:ophone)?', 'Saxophone', '🎷'],
        ['trumpet|trombone|horn|tuba', 'Brass', '🎺'],
        ['flute|clarinet|oboe|bassoon', 'Woodwind', '🎶'],
        ['sing(?:ing)?|sang|vocals?|choir', 'Singing', '🎤'],
        ['practi[cs](?:e|ed|ing)', 'Practice', '🎵'],
        ['read(?:ing)?|pages?|book', 'Reading', '📖'],
        ['stud(?:y|ied|ying)|revis(?:e|ed|ion|ing)|homework', 'Study', '📚'],
        ['journal(?:ed|ing)?|diary|writ(?:e|ing|ten)|wrote', 'Writing', '✍️'],
        ['cod(?:e|ed|ing)|programm(?:ed|ing)', 'Coding', '💻'],
        ['duolingo|spanish|french|german|italian|japanese|language', 'Language', '🗣️'],
        ['draw(?:ing)?|drew|paint(?:ed|ing)?|sketch(?:ed|ing)?', 'Art', '🎨'],
        ['cook(?:ed|ing)?|meal prep', 'Cooking', '🍳'],
        ['clean(?:ed|ing)?|tid(?:y|ied)', 'Cleaning', '🧹'],
        ['garden(?:ed|ing)?|plants?', 'Gardening', '🌱'],
        ['water polo', 'Water polo', '🤽'],
        ['water', 'Water', '💧'],
        ['coffee|espresso', 'Coffee', '☕'],
        ['tea', 'Tea', '🍵'],
        ['alcohol|beers?|wine|drinks?', 'Drinks', '🍷'],
        ['slept|sleep|nap(?:ped)?', 'Sleep', '🌙'],
        ['steps', 'Steps', '👟'],
        ['protein', 'Protein', '🥩'],
        ['calories|kcal|cals?', 'Calories', '🔥'],
        ['vitamins?|supplements?|creatine|pills?|meds?', 'Supplements', '💊'],
        ['floss(?:ed|ing)?', 'Floss', '🦷'],
        ['screen time|phone', 'Screen time', '📱'],
        ['sauna', 'Sauna', '🧖'],
        ['cold plunge|ice bath|cold shower', 'Cold plunge', '🧊']
    ].map(function (a) { return { re: new RegExp('\\b(?:' + a[0] + ')\\b', 'i'), name: a[1], ico: a[2], dist: a[3] === 'dist' }; });

    var N = '(\\d+(?:[.,]\\d+)?)';
    function num(x) { return parseFloat(String(x).replace(',', '.')); }
    function trim(n) { return String(Math.round(n * 100) / 100); }
    function fmtMinutes(m) {
        m = Math.round(m);
        if (m < 60) return m + ' min';
        var h = Math.floor(m / 60), r = m % 60;
        return h + ' h' + (r ? ' ' + r + ' min' : '');
    }

    // Finds the amount in a phrase. Returns { text, unit } and the phrase with the amount removed.
    function amount(part, act) {
        var p = part, m;
        // Durations: 1h30, 1 hr 15 min, 1.5 hours, an hour, half an hour, 45 min, 45m (for non-distance activities)
        if ((m = p.match(new RegExp(N + '\\s*(?:h|hrs?|hours?)\\s*(?:and\\s*)?(\\d+)\\s*(?:m|mins?|minutes?)?\\b', 'i')))) return [fmtMinutes(num(m[1]) * 60 + num(m[2])), p.replace(m[0], ' ')];
        if ((m = p.match(new RegExp(N + '\\s*(?:h|hrs?|hours?)\\b', 'i')))) return [fmtMinutes(num(m[1]) * 60), p.replace(m[0], ' ')];
        if ((m = p.match(/\bhalf an? hour\b/i))) return ['30 min', p.replace(m[0], ' ')];
        if ((m = p.match(/\ban? hour\b/i))) return ['1 h', p.replace(m[0], ' ')];
        if ((m = p.match(new RegExp(N + '\\s*(?:mins?|minutes?)\\b', 'i')))) return [fmtMinutes(num(m[1])), p.replace(m[0], ' ')];
        if ((m = p.match(new RegExp(N + '\\s*m\\b', 'i')))) {
            if (act && act.dist && num(m[1]) >= 50) return [trim(num(m[1])) + ' m', p.replace(m[0], ' ')];
            return [fmtMinutes(num(m[1])), p.replace(m[0], ' ')];
        }
        // Distances
        if ((m = p.match(new RegExp(N + '\\s*(?:km|k|kilometers?|kilometres?)\\b', 'i'))) && !/steps/i.test(p)) return [trim(num(m[1])) + ' km', p.replace(m[0], ' ')];
        if ((m = p.match(new RegExp(N + '\\s*(?:mi|miles?)\\b', 'i')))) return [trim(num(m[1])) + ' mi', p.replace(m[0], ' ')];
        // Volumes
        if ((m = p.match(new RegExp(N + '\\s*(?:l|liters?|litres?)\\b', 'i')))) return [trim(num(m[1])) + ' L', p.replace(m[0], ' ')];
        if ((m = p.match(new RegExp(N + '\\s*ml\\b', 'i')))) return [trim(num(m[1])) + ' ml', p.replace(m[0], ' ')];
        if ((m = p.match(new RegExp(N + '\\s*(glasses|glass|cups?|bottles?|shots?)\\b', 'i')))) return [trim(num(m[1])) + ' ' + m[2].toLowerCase(), p.replace(m[0], ' ')];
        // Weight and energy
        if ((m = p.match(new RegExp(N + '\\s*(?:g|grams?)\\b', 'i')))) return [trim(num(m[1])) + ' g', p.replace(m[0], ' ')];
        if ((m = p.match(new RegExp(N + '\\s*(?:kcal|cals?|calories)\\b', 'i')))) return [trim(num(m[1])) + ' kcal', p.replace(m[0], ' ')];
        // Steps written as 8k or 8,000
        if ((m = p.match(/(\d+(?:[.,]\d+)?)\s*k\s*steps\b/i))) return [Math.round(num(m[1]) * 1000).toLocaleString('en-US') + ' steps', p.replace(m[0], ' steps ')];
        if ((m = p.match(/(\d{1,3}(?:,\d{3})+|\d+)\s*steps\b/i))) return [parseInt(m[1].replace(/,/g, ''), 10).toLocaleString('en-US') + ' steps', p.replace(m[0], ' steps ')];
        // Pages, reps, sets, times, or a plain number
        if ((m = p.match(new RegExp(N + '\\s*(pages?|reps?|sets?|laps?|times?|x)\\b', 'i')))) {
            var u = m[2].toLowerCase(); if (u === 'x') u = 'times';
            return [trim(num(m[1])) + ' ' + u, p.replace(m[0], ' ')];
        }
        if ((m = p.match(new RegExp('(?:^|\\s)' + N + '(?=\\s|$)')))) return [trim(num(m[1])), p.replace(m[1], ' ')];
        return [null, p];
    }


    // Typo tolerance: the correctly spelled words below, compared with what was typed.
    var BY_NAME = {};
    ACTIVITIES.forEach(function (a) { if (!BY_NAME[a.name]) BY_NAME[a.name] = a; });
    var FUZZY = {
        running: 'Running', jogging: 'Running', marathon: 'Running', walking: 'Walking', hiking: 'Hiking', swimming: 'Swimming',
        cycling: 'Cycling', biking: 'Cycling', rowing: 'Rowing', tennis: 'Tennis', pickleball: 'Pickleball', padel: 'Padel',
        badminton: 'Badminton', squash: 'Squash', basketball: 'Basketball', soccer: 'Football', football: 'Football',
        volleyball: 'Volleyball', baseball: 'Baseball', softball: 'Baseball', hockey: 'Hockey', rugby: 'Rugby', golf: 'Golf',
        skiing: 'Skiing', snowboarding: 'Snowboarding', surfing: 'Surfing', climbing: 'Climbing', bouldering: 'Climbing',
        skating: 'Skating', boxing: 'Boxing', kickboxing: 'Boxing', karate: 'Martial arts', taekwondo: 'Martial arts',
        dancing: 'Dancing', salsa: 'Dancing', bachata: 'Dancing', tango: 'Dancing', ballet: 'Dancing', zumba: 'Dancing',
        horseriding: 'Horse riding', equestrian: 'Horse riding', archery: 'Archery', fencing: 'Fencing', gymnastics: 'Gymnastics',
        handball: 'Handball', cricket: 'Cricket', lacrosse: 'Lacrosse', frisbee: 'Frisbee', sailing: 'Sailing',
        kitesurfing: 'Kitesurfing', windsurfing: 'Kitesurfing', diving: 'Diving', snorkeling: 'Diving', snorkelling: 'Diving',
        fishing: 'Fishing', chess: 'Chess', triathlon: 'Triathlon', bowling: 'Bowling', wrestling: 'Wrestling',
        yoga: 'Yoga', pilates: 'Pilates', stretching: 'Stretching', meditation: 'Meditate', meditated: 'Meditate',
        meditate: 'Meditate', strength: 'Strength', workout: 'Strength', crossfit: 'Strength', weights: 'Strength',
        violin: 'Violin', cello: 'Strings', viola: 'Strings', piano: 'Piano', keyboard: 'Piano', guitar: 'Guitar',
        ukulele: 'Guitar', drums: 'Drums', drumming: 'Drums', saxophone: 'Saxophone', trumpet: 'Brass', trombone: 'Brass',
        flute: 'Woodwind', clarinet: 'Woodwind', singing: 'Singing', practice: 'Practice', reading: 'Reading',
        studying: 'Study', studied: 'Study', homework: 'Study', journaling: 'Writing', writing: 'Writing', coding: 'Coding',
        programming: 'Coding', duolingo: 'Language', drawing: 'Art', painting: 'Art', sketching: 'Art', cooking: 'Cooking',
        cleaning: 'Cleaning', gardening: 'Gardening', water: 'Water', coffee: 'Coffee', slept: 'Sleep', sleep: 'Sleep',
        steps: 'Steps', protein: 'Protein', calories: 'Calories', vitamins: 'Supplements', supplements: 'Supplements',
        creatine: 'Supplements', flossing: 'Floss', floss: 'Floss', sauna: 'Sauna', pushups: 'Pushups', pullups: 'Pull-ups',
        situps: 'Sit-ups', squats: 'Squats', burpees: 'Burpees', plank: 'Plank', planking: 'Plank'
    };
    var FUZZY_WORDS = Object.keys(FUZZY);

    // Edit distance with swapped letters counting as one change ("gutiar" -> "guitar").
    function distance(a, b) {
        var d = [], i, j;
        for (i = 0; i <= a.length; i++) { d[i] = [i]; }
        for (j = 0; j <= b.length; j++) { d[0][j] = j; }
        for (i = 1; i <= a.length; i++) {
            for (j = 1; j <= b.length; j++) {
                var cost = a[i - 1] === b[j - 1] ? 0 : 1;
                d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
                if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
            }
        }
        return d[a.length][b.length];
    }

    function fuzzyActivity(part) {
        var words = part.toLowerCase().replace(/[^a-zà-ÿ ]/g, ' ').split(/\s+/).filter(function (w) { return w.length >= 4 && !FILLER_WORDS[w]; });
        var candidates = words.slice();
        for (var k = 0; k < words.length - 1; k++) candidates.push(words[k] + words[k + 1]); // "horse ridding" -> "horseridding"
        var best = null, bestD = 99;
        candidates.forEach(function (w) {
            var allowed = w.length >= 8 ? 2 : 1;
            FUZZY_WORDS.forEach(function (target) {
                if (Math.abs(target.length - w.length) > allowed) return;
                var dd = distance(w, target);
                if (dd <= allowed && dd < bestD) { bestD = dd; best = target; }
            });
        });
        return best ? BY_NAME[FUZZY[best]] : null;
    }
    var FILLER_WORDS = {};
    'with this that then also just some about around hour hours mins minutes today morning evening night session played went have drank took'.split(' ').forEach(function (w) { FILLER_WORDS[w] = true; });

    function parseOne(part) {
        var bed = part.match(/\b(?:went to bed|bed ?time|in bed|asleep)\b\D*(\d{1,2})(?:[:.h](\d{2}))?\s*(am|pm)?/i);
        if (bed) return { ico: '🌙', name: 'Bedtime', val: bed[1] + ':' + (bed[2] || '00') + (bed[3] ? ' ' + bed[3].toUpperCase() : '') };
        var act = null;
        for (var i = 0; i < ACTIVITIES.length; i++) if (ACTIVITIES[i].re.test(part)) { act = ACTIVITIES[i]; break; }
        if (!act) act = fuzzyActivity(part);
        var res = amount(part, act), val = res[0], rest = res[1];
        // Amounts that imply an activity on their own
        if (!act && val) {
            if (/ L$| ml$| glass| cup| bottle/.test(val)) act = { name: 'Water', ico: '💧' };
            else if (/ steps$/.test(val)) act = { name: 'Steps', ico: '👟' };
            else if (/ kcal$/.test(val)) act = { name: 'Calories', ico: '🔥' };
        }
        if (act) {
            if (act.name === 'Sleep' && val && /min/.test(val) === false && /^\d/.test(val) && !/ h/.test(val)) val = val + ' h';
            if (act.name === 'Pushups' || act.name === 'Pull-ups' || act.name === 'Sit-ups' || act.name === 'Squats' || act.name === 'Burpees') {
                if (val && /^\d+$/.test(val)) val = val + ' reps';
            }
            if (act.name === 'Steps' && val) val = val.replace(/ steps$/, '');
            return { ico: act.ico, name: act.name, val: val || 'Done' };
        }
        // Unknown activity: name it after what was written, minus a leading "ate", "had", "did"... and trailing "for", "at"...
        var name = rest.replace(/[^a-zA-ZÀ-ÿ' -]/g, ' ').replace(/\s+/g, ' ').trim()
            .replace(/^(?:i\s+)?(?:ate|had|did|do|went|go|played|play|took|take|drank|made|finished)\s+(?:the\s+|a\s+|an\s+|some\s+|my\s+)?/i, '')
            .replace(/(?:\s+(?:for|at|in|on|of|with|to|about|around))+$/i, '').trim();
        if (!name) return null;
        name = name.charAt(0).toUpperCase() + name.slice(1);
        return { ico: '✅', name: name, val: val || 'Done' };
    }

    function parse(text) {
        // Keep "10,000" and a trailing "1 hr and 15 min" together before splitting on commas and "and"
        text = text.replace(/(\d),(\d{3})\b/g, '$1$2');
        text = text.replace(/(\d)\s*(h|hrs?|hours?)\s+and\s+(\d+\s*(?:m|mins?|minutes?))\s*(?=$|[,;\n])/gi, '$1$2 $3');
        return text.split(/\s*(?:,|;|\n|\+|&|\band\b|\bthen\b|\balso\b|\bplus\b)\s*/i)
            .map(function (s) { return s.trim(); })
            .filter(Boolean)
            .map(parseOne)
            .filter(Boolean);
    }

    var form = document.getElementById('say-form');
    var input = document.getElementById('say-input');
    var logged = document.getElementById('logged');

    function show(text) {
        var items = parse(text);
        logged.innerHTML = '';
        items.forEach(function (it, i) {
            var li = document.createElement('li');
            li.className = 'log-row';
            li.style.animationDelay = reduceMotion ? '0s' : (i * 0.12) + 's';
            var ico = document.createElement('span'); ico.className = 'ico'; ico.setAttribute('aria-hidden', 'true'); ico.textContent = it.ico;
            var name = document.createElement('span'); name.className = 'name'; name.textContent = it.name;
            var val = document.createElement('span'); val.className = 'val'; val.textContent = it.val;
            li.append(ico, name, val);
            logged.appendChild(li);
        });
    }

    form.addEventListener('submit', function (e) { e.preventDefault(); show(input.value || input.placeholder); });
    document.querySelectorAll('.examples .chip').forEach(function (chip) {
        chip.addEventListener('click', function () { input.value = chip.textContent; show(chip.textContent); });
    });

    /* ---------- 3. Coach week demo ---------- */
    var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    var TODAY = 1; // Tuesday: changes only ever touch today and later
    function S(id, ico, name, k, changed) { return { id: id, name: ico + ' ' + name, k: k, changed: !!changed }; }

    // Everyday weeks for different people. Each scenario starts from one of them.
    var WEEKS = {
        runner: function () {
            return [
                [S('m', '🏋️', 'Strength', 'hard')], [S('t', '🏃', 'Intervals', 'hard')], [S('w', '🧘', 'Mobility', 'easy')],
                [S('th', '😌', 'Rest', 'rest')], [S('f', '🏃', 'Easy run', 'easy')], [S('sa', '🏋️', 'Strength', 'hard')],
                [S('su', '🏃', 'Long run', 'hard')]
            ];
        },
        triathlete: function () {
            return [
                [S('m', '🏊', 'Swim intervals', 'hard')], [S('t', '🚴', 'Long ride', 'hard')], [S('w', '🏃', 'Easy run', 'easy')],
                [S('th', '🏊', 'Swim 45 min', 'hard')], [S('f', '🏋️', 'Strength', 'hard')], [S('sa', '🚴', 'Bike and run', 'hard')],
                [S('su', '🏃', 'Long run', 'hard')]
            ];
        },
        musician: function () {
            return [
                [S('m', '🎻', 'Scales 30 min', 'easy')], [S('t', '🎻', 'Repertoire 60 min', 'hard')], [S('w', '🎻', 'Etudes 45 min', 'hard')],
                [S('th', '🎻', 'Repertoire 60 min', 'hard')], [S('f', '🎻', 'Scales 30 min', 'easy')], [S('sa', '🎻', 'Repertoire 60 min', 'hard')],
                [S('su', '😌', 'Rest', 'rest')]
            ];
        },
        student: function () {
            return [
                [S('m', '📖', 'Study 2 h', 'hard')], [S('t', '📖', 'Study 2 h', 'hard')], [S('w', '🏃', 'Easy run', 'easy'), S('w2', '📖', 'Study 2 h', 'hard')],
                [S('th', '📖', 'Study 2 h', 'hard')], [S('f', '📖', 'Study 2 h', 'hard')], [S('sa', '🏃', 'Easy run', 'easy')],
                [S('su', '😌', 'Rest', 'rest')]
            ];
        }
    };

    // Each scenario mirrors what the app's plan engine does for the same week (EventPlanEngine, PlanRepairEngine).
    var scenarios = {
        tri: {
            week: 'triathlete',
            text: "Race on Saturday. Until Thursday everything turns short and easy, Friday is rest, and Sunday is a recovery walk.",
            apply: function (w) {
                w[1] = [S('t', '🚴', 'Easy ride 60 min', 'easy', true)];
                w[3] = [S('th', '🏊', 'Easy swim 20 min', 'easy', true)];
                w[4] = [S('f', '😌', 'Rest', 'rest', true)];
                w[5] = [S('sa', '🏅', 'Triathlon', 'event', true)];
                w[6] = [S('su', '🚶', 'Recovery walk', 'easy', true)];
            }
        },
        concert: {
            week: 'musician',
            text: "Concert on Saturday. A full run-through Thursday, light practice and an early night Friday, and a day off after the show.",
            apply: function (w) {
                w[3] = [S('th', '🎻', 'Full run-through', 'hard', true)];
                w[4] = [S('f', '🎻', 'Light practice', 'easy', true), S('f2', '🌙', 'Early night', 'easy', true)];
                w[5] = [S('sa', '🎤', 'Concert', 'event', true)];
                w[6] = [S('su', '😌', 'Day off', 'rest', true)];
            }
        },
        exam: {
            week: 'student',
            text: "Exam on Friday. A timed past paper Thursday, then bed by 11. Saturday is a free day.",
            apply: function (w) {
                w[3] = [S('th', '📝', 'Timed past paper', 'hard', true), S('th2', '🌙', 'Bed by 11', 'easy', true)];
                w[4] = [S('f', '🎓', 'Exam', 'event', true)];
                w[5] = [S('sa', '🎉', 'Free day', 'rest', true)];
            }
        },
        race: {
            week: 'runner',
            text: "10K on Sunday. Today's intervals become an easy run, Saturday is a short easy run instead of strength, and Sunday is race day.",
            apply: function (w) {
                w[1] = [S('t', '🏃', 'Easy run 30 min', 'easy', true)];
                w[5] = [S('sa', '🏃', 'Short easy run', 'easy', true)];
                w[6] = [S('su', '🏅', '10K race', 'event', true)];
            }
        },
        skip: {
            week: 'runner',
            text: "No stress about Monday. Your strength session moves to Thursday, which was free and sits between two easy days.",
            apply: function (w) {
                w[0] = [S('m-x', '🏋️', 'Strength', 'missed')];
                w[3] = [S('m', '🏋️', 'Strength', 'hard', true)];
            }
        },
        recovery: {
            week: 'runner',
            text: "Your recovery's low today, HRV is below your baseline. Let's ease today's intervals down to an easy run.",
            apply: function (w) {
                w[1] = [S('t', '🏃', 'Easy run', 'easy', true)];
            }
        },
        travel: {
            week: 'runner',
            text: "Looks like you're in a new time zone. Want the hotel versions this week? Saturday's strength goes bodyweight, and runs drop their pace targets.",
            apply: function (w) {
                w[1] = [S('t', '🏃', 'Intervals, no pace target', 'hard', true)];
                w[5] = [S('sa', '🤸', 'Bodyweight strength', 'hard', true)];
            }
        },
        nogym: {
            week: 'runner',
            text: "Gym closed this week? Switch on home workouts and Saturday's strength becomes the home version. Same muscles, no equipment.",
            apply: function (w) {
                w[5] = [S('sa', '🏠', 'Home strength', 'hard', true)];
            }
        },
        sticking: {
            week: 'runner',
            text: "That's two strength sessions missed this week. How about once a week instead of twice? Easier to keep, and you still progress.",
            apply: function (w) {
                w[0] = [S('m-x', '🏋️', 'Strength', 'missed')];
                w[5] = [S('sa', '🏋️', 'Strength', 'missed')];
            }
        }
    };

    var weekEl = document.getElementById('week');
    var bubble = document.getElementById('bubble');
    var bubbleText = document.getElementById('bubble-text');
    var bubbleActions = document.getElementById('bubble-actions');
    var scenarioBtns = document.querySelectorAll('.week-card .scenario');
    var current = null, pending = null;

    function render(week) {
        weekEl.innerHTML = '';
        week.forEach(function (sessions, d) {
            var day = document.createElement('div');
            day.className = 'day' + (d === TODAY ? ' today' : '');
            var dn = document.createElement('span');
            dn.className = 'dname' + (d === TODAY ? ' now' : '');
            dn.textContent = d === TODAY ? 'Today' : DAYS[d];
            var slot = document.createElement('div'); slot.className = 'slot';
            sessions.forEach(function (s) {
                var el = document.createElement('span');
                el.className = 'sess ' + (s.k === 'hard' ? '' : s.k) + (s.changed ? ' changed' : '');
                el.textContent = s.name;
                if (s.k === 'missed') el.setAttribute('aria-label', s.name + ', dropped');
                if (!reduceMotion) el.style.viewTransitionName = 's-' + s.id;
                slot.appendChild(el);
            });
            day.append(dn, slot);
            weekEl.appendChild(day);
        });
    }

    function transition(fn) {
        if (document.startViewTransition && !reduceMotion) document.startViewTransition(fn);
        else fn();
    }

    function pick(key) {
        current = key;
        clearTimeout(pending);
        scenarioBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.scenario === key ? 'true' : 'false'); });
        var sc = scenarios[key];
        var before = WEEKS[sc.week]();
        var after = WEEKS[sc.week]();
        sc.apply(after);
        render(before);
        bubble.hidden = true;
        // Show the usual week for a beat, then let the coach rework it.
        pending = setTimeout(function () {
            transition(function () { render(after); });
            bubbleText.textContent = sc.text;
            bubbleActions.hidden = false;
            bubble.hidden = false;
        }, reduceMotion ? 0 : 450);
    }

    scenarioBtns.forEach(function (b) { b.addEventListener('click', function () { pick(b.dataset.scenario); }); });
    document.getElementById('accept').addEventListener('click', function () {
        bubbleText.textContent = 'Done. Your week is updated.';
        bubbleActions.hidden = true;
    });
    document.getElementById('decline').addEventListener('click', function () {
        if (current) transition(function () { render(WEEKS[scenarios[current].week]()); });
        scenarioBtns.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        bubbleText.textContent = 'No problem. Your week stays as it was.';
        bubbleActions.hidden = true;
    });
    render(WEEKS.runner());

    /* ---------- 4. Kitchen: receipt to pantry to dinner ---------- */
    var PANTRY = [
        { n: 'Chicken breast', ico: '🍗', lvl: 'plenty' },
        { n: 'Basmati rice', ico: '🍚', lvl: 'plenty' },
        { n: 'Baby spinach', ico: '🥬', lvl: 'some' },
        { n: 'Greek yogurt', ico: '🥛', lvl: 'some' },
        { n: 'Eggs', ico: '🥚', lvl: 'plenty' },
        { n: 'Avocado', ico: '🥑', lvl: 'some' },
        { n: 'Lemons', ico: '🍋', lvl: 'some' },
        { n: 'Garlic', ico: '🧄', lvl: 'plenty' },
        { n: 'Chickpeas', ico: '🫘', lvl: 'some' },
        { n: 'Feta', ico: '🧀', lvl: 'some' },
        { n: 'Cherry tomatoes', ico: '🍅', lvl: 'plenty' },
        { n: 'Wraps', ico: '🫓', lvl: 'some' }
    ];
    // Three rounds of a fast, a medium, and a slow dinner, all made only from the pantry above.
    var TIERS = { fast: '⚡ Fast', medium: '🍳 Medium', slow: '🍲 Slow' };
    var DINNER_SETS = [[
        { tier: 'fast', t: 'Crispy egg & avocado wraps with blistered tomatoes', p: 28, min: 10, uses: ['Eggs', 'Avocado', 'Wraps', 'Cherry tomatoes'] },
        { tier: 'medium', t: 'Lemon-garlic chicken over spinach rice', p: 46, min: 25, uses: ['Chicken breast', 'Basmati rice', 'Baby spinach', 'Lemons', 'Garlic'] },
        { tier: 'slow', t: 'Chicken shawarma bowls with crispy chickpeas and garlic yogurt', p: 54, min: 45, uses: ['Chicken breast', 'Chickpeas', 'Greek yogurt', 'Garlic', 'Basmati rice', 'Cherry tomatoes'] }
    ], [
        { tier: 'fast', t: 'Turkish eggs on garlic yogurt, warm wraps to dip', p: 30, min: 12, uses: ['Eggs', 'Greek yogurt', 'Garlic', 'Wraps'] },
        { tier: 'medium', t: 'Chicken, chickpea & tomato tray bake with feta', p: 50, min: 30, uses: ['Chicken breast', 'Chickpeas', 'Cherry tomatoes', 'Feta', 'Lemons'] },
        { tier: 'slow', t: 'Souvlaki skewers with tzatziki and lemon rice', p: 48, min: 50, uses: ['Chicken breast', 'Greek yogurt', 'Lemons', 'Garlic', 'Basmati rice'] }
    ], [
        { tier: 'fast', t: 'Spinach & feta scramble in a toasted wrap', p: 27, min: 8, uses: ['Eggs', 'Baby spinach', 'Feta', 'Wraps'] },
        { tier: 'medium', t: 'Smashed chickpea & avocado salad with a jammy egg', p: 24, min: 20, uses: ['Chickpeas', 'Avocado', 'Eggs', 'Lemons', 'Cherry tomatoes'] },
        { tier: 'slow', t: 'Garlic chicken fried rice with spinach and a crispy egg', p: 45, min: 40, uses: ['Chicken breast', 'Basmati rice', 'Eggs', 'Baby spinach', 'Garlic'] }
    ]];
    var dinnerSet = 0;
    var LEVEL_DOWN = { plenty: 'some', some: 'low', low: 'out', out: 'out' };
    var LEVEL_UP = { out: 'low', low: 'some', some: 'plenty', plenty: 'out' }; // same cycle as the app
    var TARGET = 150;
    var protein = 118, pantry = [];

    var receipt = document.getElementById('receipt');
    var scanBtn = document.getElementById('scan');
    var pantryEl = document.getElementById('pantry');
    var dinnerSlot = document.getElementById('dinner-slot');
    var ring = document.getElementById('ring');
    var ringVal = document.getElementById('ring-val');
    var gapText = document.getElementById('gap-text');

    function renderPantry(animate) {
        pantryEl.innerHTML = '';
        pantry.forEach(function (item, i) {
            var li = document.createElement('li');
            li.style.animationDelay = animate && !reduceMotion ? (i * 0.08) + 's' : '0s';
            if (!animate) li.style.animation = 'none';
            var ico = document.createElement('span'); ico.setAttribute('aria-hidden', 'true'); ico.textContent = item.ico;
            var name = document.createElement('span'); name.textContent = item.n;
            var lvl = document.createElement('button');
            lvl.type = 'button';
            lvl.className = 'level ' + item.lvl;
            lvl.textContent = item.lvl[0].toUpperCase() + item.lvl.slice(1);
            lvl.setAttribute('aria-label', item.n + ': ' + item.lvl + '. Tap to change.');
            lvl.addEventListener('click', function () { item.lvl = LEVEL_UP[item.lvl]; renderPantry(false); pantryEl.querySelectorAll('.level')[i].focus(); });
            li.append(ico, name, lvl);
            pantryEl.appendChild(li);
        });
        var low = pantry.filter(function (p) { return p.lvl === 'low' || p.lvl === 'out'; }).map(function (p) { return p.n.toLowerCase().replace('greek', 'Greek'); });
        if (low.length) {
            var hint = document.createElement('li');
            hint.className = 'pantry-hint';
            hint.style.cssText = 'background:none;border:0;padding:4px 2px;animation:none';
            var list = low.length > 1 ? low.slice(0, -1).join(', ') + ' and ' + low[low.length - 1] : low[0];
            hint.textContent = 'Running low on ' + list + '. Added to your shopping list.';
            pantryEl.appendChild(hint);
        }
    }

    function setProtein(to) {
        var from = protein;
        protein = to;
        var start = performance.now(), dur = reduceMotion ? 0 : 900;
        function frame(now) {
            var t = dur ? Math.min(1, (now - start) / dur) : 1;
            var v = Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3)));
            ringVal.textContent = v;
            ring.style.setProperty('--p', Math.min(100, v / TARGET * 100));
            if (t < 1) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
        var left = TARGET - to;
        gapText.textContent = left > 0 ? left + ' g protein to go today' : 'Protein target reached today';
    }

    function renderDinner() {
        dinnerSlot.innerHTML = '';
        DINNER_SETS[dinnerSet].forEach(function (d, i) {
            var card = document.createElement('div'); card.className = 'dinner';
            card.style.animationDelay = reduceMotion ? '0s' : (i * 0.1) + 's';
            var tier = document.createElement('span'); tier.className = 'tier ' + d.tier; tier.textContent = TIERS[d.tier];
            var h = document.createElement('h4'); h.textContent = d.t;
            var meta = document.createElement('div'); meta.className = 'meta';
            meta.innerHTML = '<span>🥩 <b>' + d.p + ' g</b> protein</span><span>⏱ <b>' + d.min + '</b> min</span>';
            var uses = document.createElement('span'); uses.textContent = 'Uses ' + d.uses.join(', ').toLowerCase().replace('greek', 'Greek');
            meta.appendChild(uses);
            var cook = document.createElement('button'); cook.type = 'button'; cook.className = 'btn btn-primary btn-sm'; cook.textContent = 'Cooked it';
            cook.setAttribute('aria-label', 'Cooked it: ' + d.t);
            cook.addEventListener('click', function () { cooked(d); });
            card.append(tier, h, meta, cook);
            dinnerSlot.appendChild(card);
        });
        var more = document.createElement('button');
        more.type = 'button'; more.className = 'btn btn-ghost btn-sm more-ideas'; more.textContent = '↻ Show me other ideas';
        more.addEventListener('click', function () { dinnerSet = (dinnerSet + 1) % DINNER_SETS.length; renderDinner(); });
        dinnerSlot.appendChild(more);
    }

    function cooked(d) {
        setProtein(protein + d.p);
        pantry.forEach(function (item) { if (d.uses.indexOf(item.n) !== -1) item.lvl = LEVEL_DOWN[item.lvl]; });
        renderPantry(false);
        dinnerSlot.innerHTML = '';
        var card = document.createElement('div'); card.className = 'dinner';
        var h = document.createElement('h4'); h.textContent = 'Logged. Your pantry is updated.';
        var p = document.createElement('p'); p.className = 'muted'; p.style.margin = '0 0 12px'; p.textContent = d.t + ', +' + d.p + ' g protein.';
        var reset = document.createElement('button'); reset.type = 'button'; reset.className = 'btn btn-ghost btn-sm'; reset.textContent = 'Start over';
        reset.addEventListener('click', resetKitchen);
        card.append(h, p, reset);
        dinnerSlot.appendChild(card);
    }

    function resetKitchen() {
        pantry = []; dinnerSet = 0;
        renderPantry(false);
        receipt.classList.remove('scanned', 'scanning');
        scanBtn.hidden = false;
        setProtein(118);
        dinnerSlot.innerHTML = '<p class="placeholder">Scan the receipt first. Ideas only use what you actually have.</p>';
    }

    scanBtn.addEventListener('click', function () {
        scanBtn.hidden = true;
        receipt.classList.add('scanning');
        setTimeout(function () {
            receipt.classList.remove('scanning');
            receipt.classList.add('scanned');
            pantry = PANTRY.map(function (p) { return { n: p.n, ico: p.ico, lvl: p.lvl }; });
            renderPantry(true);
            renderDinner();
        }, reduceMotion ? 0 : 900);
    });

    /* ---------- 5. Habit stats: numbers and charts that agree ---------- */
    // Weekly values run oldest to newest; the last one is this week. The stats are derived from them.
    var HABITS = {
        running: {
            color: '#2F7DF6', ink: ['#1F5FD1', '#6AA5FF'],
            stats: [['Sessions', '12', 'in 30 days'], ['Distance', '58.4 km', 'in 30 days'], ['Time', '5h 48m', 'in 30 days'], ['Avg pace', '5:58 /km', '30-day average']],
            insight: ['This week 16.2 km, last week 14.6 km (+1.6 km).', 'Distance is climbing while your pace holds steady.'],
            chart: 'Weekly distance (km)', bars: [9.2, 11.5, 0, 12.8, 13.1, 10.4, 14.6, 16.2], fmt: function (v) { return v.toFixed(1); },
            records: [['⏱', '1h 12m', 'Longest'], ['📍', '14.1 km', 'Farthest'], ['⚡', '4:52 /km', 'Fastest pace'], ['🔥', '980 kcal', 'Most burned']]
        },
        piano: {
            color: '#8B5CF6', ink: ['#6D3FE0', '#B79CFF'],
            stats: [['Sessions', '22', 'in 30 days'], ['Time', '14h 12m', 'in 30 days'], ['Consistency', '73%', 'last 30 days'], ['Avg session', '39 min', 'per day played']],
            insight: ['This week 4h 6m, last week 3h 36m (+30 min).', 'You average 39 min each time you sit down to play.'],
            chart: 'Weekly practice (hours)', bars: [2.1, 2.8, 3.0, 2.5, 3.1, 3.4, 3.6, 4.1], fmt: function (v) { return v.toFixed(1); },
            records: [['🔥', '19 days', 'Best streak'], ['⏱', '1h 45m', 'Longest session'], ['⭐', '4h 6m', 'Best week'], ['✅', '96 days', 'Total played']]
        },
        plank: {
            color: '#22A55B', ink: ['#15803D', '#4ADE80'],
            stats: [['Current streak', '12', 'days'], ['Done', '26', 'of last 30 days'], ['Consistency', '87%', 'last 30 days'], ['Total time', '112 min', 'last 30 days']],
            insight: ['This week 28 min, last week 30 min.', 'You average 4.3 min on the days you plank.'],
            chart: 'Weekly time (min)', bars: [12, 4, 22, 25, 26, 28, 30, 28], fmt: function (v) { return String(Math.round(v)); },
            records: [['🔥', '33 days', 'Best streak'], ['⭐', '12 min', 'Best day'], ['📊', '4.3 min', 'Avg per active day'], ['✅', '133 days', 'Total done']]
        }
    };

    var habitTabs = Array.prototype.slice.call(document.querySelectorAll('.habit-tab'));
    var habitCard = document.querySelector('.habit-card');
    var statsEl = document.getElementById('h-stats');
    var insightEl = document.getElementById('h-insight');
    var recordsEl = document.getElementById('h-records');
    var chartTitle = document.getElementById('h-chart-title');
    var barsEl = document.getElementById('h-bars');

    function weekLabels() {
        // Mondays of the last eight weeks, oldest first.
        var d = new Date(); d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        var out = [];
        for (var i = 7; i >= 0; i--) {
            var m = new Date(d); m.setDate(d.getDate() - i * 7);
            out.push(m.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        }
        return out;
    }

    function niceMax(v) {
        var steps = [5, 10, 20, 30, 40, 50];
        for (var i = 0; i < steps.length; i++) if (v <= steps[i]) return steps[i];
        return Math.ceil(v / 10) * 10;
    }

    function drawBars(h) {
        var W = 560, H = 220, left = 8, right = 40, top = 10, bottom = 28;
        var max = niceMax(Math.max.apply(null, h.bars));
        var n = h.bars.length, slot = (W - left - right) / n, bw = slot * 0.62;
        var labels = weekLabels();
        var y = function (v) { return top + (1 - v / max) * (H - top - bottom); };
        var out = '<defs><linearGradient id="bar-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + h.color + '" stop-opacity="0.75"/><stop offset="1" stop-color="' + h.color + '"/></linearGradient></defs>';
        [0, 0.5, 1].forEach(function (f) {
            var yy = y(max * f);
            out += '<line x1="' + left + '" x2="' + (W - right + 6) + '" y1="' + yy + '" y2="' + yy + '" stroke="currentColor" stroke-opacity="0.12"/>';
            out += '<text x="' + W + '" y="' + (yy + 4) + '" text-anchor="end" font-size="12" fill="currentColor" fill-opacity="0.6">' + (max * f) + '</text>';
        });
        h.bars.forEach(function (v, i) {
            var x = left + i * slot + (slot - bw) / 2;
            var yy = y(v), hh = Math.max(0, (H - bottom) - yy);
            out += '<rect x="' + x.toFixed(1) + '" y="' + yy.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + hh.toFixed(1) + '" rx="6" fill="url(#bar-g)"' + (i === n - 1 ? '' : ' fill-opacity="0.85"') + '><title>' + labels[i] + ': ' + h.fmt(v) + '</title></rect>';
            if (i % 2 === 1) out += '<text x="' + (x + bw / 2) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="12" fill="currentColor" fill-opacity="0.6">' + labels[i] + '</text>';
        });
        barsEl.innerHTML = out;
        barsEl.setAttribute('aria-label', h.chart + ' for the last 8 weeks: ' + h.bars.map(h.fmt).join(', ') + '. This week: ' + h.fmt(h.bars[n - 1]) + '.');
    }

    function showHabit(key) {
        var h = HABITS[key];
        habitTabs.forEach(function (t) {
            var on = t.dataset.habit === key;
            t.setAttribute('aria-selected', on ? 'true' : 'false');
            t.tabIndex = on ? 0 : -1;
        });
        habitCard.style.setProperty('--hc', h.color);
        habitCard.style.setProperty('--hc-ink', isDarkNow() ? h.ink[1] : h.ink[0]);
        statsEl.innerHTML = '';
        h.stats.forEach(function (st) {
            var div = document.createElement('div'); div.className = 'stat';
            div.innerHTML = '<div class="l"></div><div class="v"></div><div class="s"></div>';
            div.children[0].textContent = st[0]; div.children[1].textContent = st[1]; div.children[2].textContent = st[2];
            statsEl.appendChild(div);
        });
        insightEl.innerHTML = '';
        h.insight.forEach(function (line) { var p = document.createElement('p'); p.textContent = line; insightEl.appendChild(p); });
        recordsEl.innerHTML = '';
        h.records.forEach(function (r) {
            var div = document.createElement('div'); div.className = 'rec';
            div.innerHTML = '<span class="i" aria-hidden="true"></span><span><b></b><span class="l"></span></span>';
            div.querySelector('.i').textContent = r[0]; div.querySelector('b').textContent = r[1]; div.querySelector('.l').textContent = r[2];
            recordsEl.appendChild(div);
        });
        chartTitle.textContent = h.chart;
        drawBars(h);
        activeHabit = key;
    }
    var activeHabit = 'running';
    function isDarkNow() {
        var t = document.documentElement.dataset.theme;
        return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    }
    habitTabs.forEach(function (t, i) {
        t.addEventListener('click', function () { showHabit(t.dataset.habit); });
        t.addEventListener('keydown', function (e) {
            var n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null;
            if (n === null) return;
            n = (n + habitTabs.length) % habitTabs.length;
            showHabit(habitTabs[n].dataset.habit); habitTabs[n].focus(); e.preventDefault();
        });
    });
    document.addEventListener('themechange', function () { showHabit(activeHabit); });
    showHabit('running');

    /* ---------- 6. Connected day, and a goal that is always 30 days out ---------- */
    // Each chain is something the app does today (readiness incl. fuel, background workout sync, calendar load, dinner timing).
    var NIGHTS = {
        good: { chips: ['🌙 7h 50m sleep', '💚 Readiness 72', '🏃 Intervals as planned', '🍴 Dinner closes the protein gap'], changed: [],
                text: 'Well rested. The intervals stay, and tonight\'s dinner ideas aim to close your protein gap.' },
        short: { chips: ['🌙 5h 10m sleep', '🟠 Readiness 41', '🏃 Easy run instead', '🍴 Earlier dinner, earlier bed'], changed: [2, 3],
                 text: 'Short night. Intervals become an easy run, and dinner moves earlier so you get to bed sooner.' },
        fuel: { chips: ['🍗 92 of 150 g protein yesterday', '🟡 Readiness 61', '🏋️ Strength as planned', '🍴 Protein-heavy dinner ideas'], changed: [1, 3],
                text: 'Yesterday was a hard day and protein came up short, so readiness dips a little. Training stays, and tonight\'s ideas make up the difference.' },
        workout: { chips: ['⌚ 45 min run, 4.8 km', '✅ Ticked off your plan', '💬 32 g protein to go', '🍴 Dinner sized to match'], changed: [1, 2],
                   text: 'Finish a run on your Watch and it\'s logged and ticked off within minutes. The coach sends one short note about what\'s left today.' },
        calendar: { chips: ['📅 7 hours of meetings', '🏃 Intervals would be squeezed', '➡️ Moved to Thursday', '😌 Today stays light'], changed: [2, 3],
                    text: 'A packed day on your calendar. The coach suggests moving the hard session to a freer day. It only reads how busy you are, never what the meetings are.' },
        late: { chips: ['🍝 Dinner after 9 PM, three nights', '🌙 Sleep running short', '🕗 Wrap-up moves to 8:00 PM', '🍴 Earlier dinner ideas'], changed: [2, 3],
                text: 'Late dinners have been cutting into your sleep. The coach suggests wrapping up the evening earlier, and dinner ideas arrive sooner.' }
    };
    var stripEl = document.getElementById('strip'), stripText = document.getElementById('strip-text');
    var nightBtns = document.querySelectorAll('[data-night]');
    function showNight(key) {
        var n = NIGHTS[key];
        nightBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.night === key ? 'true' : 'false'); });
        stripEl.innerHTML = '';
        n.chips.forEach(function (c, i) {
            if (i) { var a = document.createElement('span'); a.className = 'arrow'; a.setAttribute('aria-hidden', 'true'); a.textContent = '→'; stripEl.appendChild(a); }
            var sp = document.createElement('span'); sp.textContent = c; if (n.changed.indexOf(i) !== -1) sp.className = 'chg'; stripEl.appendChild(sp);
        });
        stripText.textContent = n.text;
    }
    nightBtns.forEach(function (b) { b.addEventListener('click', function () { showNight(b.dataset.night); }); });
    showNight('good');

    var target = new Date();
    target.setDate(target.getDate() + 30);
    document.getElementById('target-date').textContent = target.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    document.getElementById('cal-month').textContent = target.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    document.getElementById('cal-day').textContent = target.getDate();

    /* ---------- 7. Dark screenshots ---------- */
    // Once dark versions exist (img/<name>-dark-360.webp and -dark-660.webp), add data-dark-shots
    // to #screens and the phone follows the theme.
    var shots = Array.prototype.slice.call(document.querySelectorAll('.screen img'));
    var darkReady = screens.hasAttribute('data-dark-shots');
    function isDark() {
        var t = document.documentElement.dataset.theme;
        return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    }
    function toDark(url) { return url.replace(/-(\d+)\.webp/g, '-dark-$1.webp'); }
    function applyShots() {
        if (!darkReady) return;
        var dark = isDark();
        shots.forEach(function (img) {
            if (!img.dataset.lightSrc) { img.dataset.lightSrc = img.getAttribute('src'); img.dataset.lightSrcset = img.getAttribute('srcset'); }
            img.srcset = dark ? toDark(img.dataset.lightSrcset) : img.dataset.lightSrcset;
            img.src = dark ? toDark(img.dataset.lightSrc) : img.dataset.lightSrc;
        });
    }
    applyShots();
    document.addEventListener('themechange', applyShots);

    /* ---------- 8. Streak counter and scroll reveal ---------- */
    var counter = document.getElementById('streak-count');
    function countUp() {
        if (reduceMotion) return;
        var n = 0;
        var id = setInterval(function () { n += 1; counter.textContent = n; if (n >= 38) clearInterval(id); }, 24);
    }

    if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (!e.isIntersecting) return;
                e.target.classList.add('in');
                if (e.target.contains(counter)) countUp();
                io.unobserve(e.target);
            });
        }, { threshold: 0.15 });
        document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
    } else {
        document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
    }
})();
