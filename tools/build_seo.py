"""Generate everything that helps people (and crawlers, and language models)
find the course: per-page head tags, JSON-LD, Open Graph cards, the sitemap,
the Atom feed, llms.txt, and the "all sessions" footer nav.

Run it from the repo root after adding or renaming a session:

    python tools/build_seo.py

It rewrites the blocks between the `<!-- seo:head -->` and
`<!-- seo:sessions-nav -->` markers in each page, and regenerates the root
files. Everything it writes is committed, so the live site needs no build step.
Modified dates come from git (the last commit that changed a page outside the
generated blocks), so running the script again does not bump them.
Requires Pillow (for the cards) and node (to read each session's demo steps).
"""
import html
import json
import os
import re
import subprocess
import sys
import textwrap
from datetime import date, datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = 'https://inboxpraveen.github.io/Py-Internals/'
REPO = 'https://github.com/inboxpraveen/Py-Internals'
AUTHOR = {'name': 'Praveen Kumar', 'url': 'https://github.com/inboxpraveen'}
TODAY = date.today().isoformat()
# Linked from each page's head rather than imported from base.css, so the browser
# can fetch the fonts and the CSS at the same time instead of one after the other.
FONTS = ('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400'
         '&family=JetBrains+Mono:wght@400;500;600'
         '&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap')

# One row per page. `path` is the folder or file relative to the site root.
PAGES = [
    {
        'id': 'home', 'path': '', 'file': 'index.html', 'type': 'website',
        'title': 'Py Internals: Learn How Python Really Works, Visually',
        'og_title': 'Py Internals: Learn Python from the Inside Out',
        'card_eyebrow': 'Open source · Free · Interactive',
        'card_title': 'Learn Python the way it actually works',
        'description': 'A free, open-source Python course that shows what your code does in memory. Step through names, frames, references, classes, generators, the GIL and exceptions.',
    },
    {
        'id': 'glossary', 'path': 'glossary.html', 'file': 'glossary.html', 'type': 'website',
        'title': 'Python Internals Glossary: Names, Frames, Refcounts, GIL',
        'og_title': 'Py Internals Glossary',
        'card_eyebrow': 'Glossary',
        'card_title': 'The words the course uses, in plain English',
        'description': 'Plain-English definitions for the words you meet while learning how Python works: names, objects, frames, closures, generators, decorators, the GIL and exceptions.',
    },
    {
        'id': '01-variables', 'num': '01', 'type': 'article', 'published': '2026-03-23', 'time': 'PT25M',
        'h1': 'Variables & Mutability', 'section': 'Foundations',
        'title': 'Python Variables and Mutability, Visualised | Py Internals',
        'description': 'See what x = 42 really does in memory. Names, objects, id(), aliasing, mutation versus rebinding and reference counting, animated one step at a time.',
        'teaches': ['Python variables as names bound to objects', 'id() and object identity', 'aliasing', 'mutation versus rebinding', 'reference counting and garbage collection', 'mutable and immutable types'],
    },
    {
        'id': '02-functions', 'num': '02', 'type': 'article', 'published': '2026-05-05', 'time': 'PT35M',
        'h1': 'Functions, Scope & the Call Stack', 'section': 'Foundations',
        'title': 'Python Functions, Scope and the Call Stack | Py Internals',
        'description': 'Watch a call frame appear and disappear. Local scope, LEGB lookup, arguments passed by reference, closures with real cells and the mutable default trap.',
        'teaches': ['function objects', 'call frames and the call stack', 'local and global scope', 'LEGB name lookup', 'argument passing by object reference', 'closures and cells', 'mutable default arguments'],
    },
    {
        'id': '03-lists-dicts', 'num': '03', 'type': 'article', 'published': '2026-05-07', 'time': 'PT40M',
        'h1': 'Lists, Dicts & References', 'section': 'Foundations',
        'title': 'Python Lists, Dicts and References: Aliases and Copies',
        'description': 'Why b = a shares a list, what a shallow copy really copies, how deepcopy differs, and why passing a dict to a function can change the caller\'s data.',
        'teaches': ['containers hold references', 'list and dict aliasing', 'shallow copy versus deep copy', 'nested container mutation', 'function side effects on containers', 'hashable keys'],
    },
    {
        'id': '04-classes', 'num': '04', 'type': 'article', 'published': '2026-08-15', 'time': 'PT45M',
        'h1': 'Classes & Objects', 'section': 'Objects',
        'title': 'Python Classes and Objects: self, __dict__ and the MRO',
        'description': 'What self really is, where attributes live, how bound methods work, why class attributes are shared and how inheritance is just a longer lookup.',
        'teaches': ['what self is', 'instance __dict__ and class namespace', 'attribute lookup order', 'bound methods', 'class attributes versus instance attributes', '__new__ and __init__', 'inheritance and the MRO'],
    },
    {
        'id': '05-iterators', 'num': '05', 'type': 'article', 'published': '2026-08-15', 'time': 'PT35M',
        'h1': 'Iterators & Generators', 'section': 'Control flow',
        'title': 'Python Iterators and Generators: iter, next and yield',
        'description': 'How a for loop uses iter and next, what StopIteration does, how yield pauses a frame and what lazy evaluation costs in memory compared with a list.',
        'teaches': ['the iterator protocol', 'iter and next', 'StopIteration', 'generators and yield', 'suspended frames', 'lazy versus eager evaluation'],
    },
    {
        'id': '06-decorators', 'num': '06', 'type': 'article', 'published': '2026-09-03', 'time': 'PT40M',
        'h1': 'Decorators', 'section': 'Functions',
        'title': 'Python Decorators Explained: @ Means f = deco(f)',
        'description': 'A decorator is one line of assignment. See the wrapper, the closure cell that keeps your function alive, functools.wraps, decorator factories and stacking.',
        'teaches': ['decorators as f = deco(f)', 'wrapper functions', 'closure cells', 'functools.wraps and __wrapped__', 'decorator factories', 'stacking decorators'],
    },
    {
        'id': '07-gil', 'num': '07', 'type': 'article', 'published': '2026-09-12', 'time': 'PT50M',
        'h1': 'The GIL & Concurrency', 'section': 'Runtime',
        'title': "Python's GIL and Concurrency: Threads, Processes, asyncio",
        'description': "Why CPython has a global interpreter lock, why it doesn't make your code thread-safe, and when threads, multiprocessing or asyncio actually help.",
        'teaches': ['the Global Interpreter Lock', 'thread switching and the switch interval', 'race conditions', 'threading.Lock', 'I/O-bound versus CPU-bound work', 'multiprocessing', 'asyncio and the event loop', 'free-threaded Python'],
    },
    {
        'id': '08-exceptions', 'num': '08', 'type': 'article', 'published': '2026-09-17', 'time': 'PT45M',
        'h1': 'Exceptions, Tracebacks & Context Managers', 'section': 'Control flow',
        'title': 'Python Exceptions, Tracebacks and Context Managers',
        'description': 'What raise does to the call stack, how to read a traceback, why finally runs past a return, what with calls for you and how exceptions chain with from.',
        'teaches': ['raise and stack unwinding', 'reading a traceback', 'try, except, else and finally', 'exception hierarchy', 'context managers and the with statement', '__enter__ and __exit__', 'exception chaining with raise from'],
    },
]

for p in PAGES:
    if 'num' in p:
        p['path'] = f"sessions/{p['id']}/"
        p['file'] = f"sessions/{p['id']}/index.html"
        p['og_title'] = p['title'].split(' | ')[0]
        p['card_eyebrow'] = f"{p['section']} · Session {p['num']}"
        p['card_title'] = p['h1']
    p['url'] = SITE + p['path']
    p['og_image'] = f"assets/images/og/{p['id']}.png"
    p['og_image_url'] = SITE + p['og_image']

SESSIONS = [p for p in PAGES if 'num' in p]


# ─────────────────────────── helpers ───────────────────────────

def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')


def write(rel, text):
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding='utf-8', newline='\n')
    print('wrote', rel)


def git(*args):
    """Output of a git command run in the repo, or empty when it fails (a file with no history yet, say)."""
    done = subprocess.run(['git', *args], cwd=ROOT, capture_output=True, text=True, encoding='utf-8', errors='replace')
    return done.stdout if done.returncode == 0 else ''


GENERATED = re.compile(r'<!-- seo:(head|sessions-nav|404-sessions) -->.*?<!-- /seo:\1 -->'
                       r'|<title>.*?</title>|<meta name="description"[^>]*>', re.S)


def content_only(text):
    """A page with everything this script writes taken out, so a regeneration on its own never counts as an edit."""
    return GENERATED.sub('', text.replace('\r\n', '\n'))


def modified_date(paths, floor=''):
    """The day the files last really changed. Today if one differs from HEAD outside the generated blocks (or is
    untracked); otherwise the newest commit that touched something outside them. Never earlier than `floor`."""
    for p in paths:
        if content_only(read(p)) != content_only(git('show', f'HEAD:{p}')):
            return TODAY
    for line in git('log', '--format=%H %cs', '--', *paths).splitlines():
        sha, day = line.split()
        for p in paths:
            if content_only(git('show', f'{sha}:{p}')) != content_only(git('show', f'{sha}^:{p}')):
                return max(day, floor)
    return max(TODAY, floor)


def stamp_dates():
    """Work out each page's last-modified day before anything gets rewritten."""
    for p in PAGES:
        files = [p['file']] + ([f"sessions/{p['id']}/session.js"] if 'num' in p else [])
        p['modified'] = modified_date(files, p.get('published', ''))


def replace_block(text, start, end, body):
    """Replace (or insert before </head>) the region between two marker comments."""
    pattern = re.compile(re.escape(start) + r'.*?' + re.escape(end), re.S)
    block = f"{start}\n{body}\n{end}"
    if pattern.search(text):
        return pattern.sub(lambda m: block, text, count=1)
    return text


def esc(s):
    return html.escape(s, quote=True)


def plain(fragment):
    """Inner HTML to plain text: tags out, entities decoded, whitespace folded."""
    t = re.sub(r'<[^>]+>', '', fragment)
    return re.sub(r'\s+', ' ', html.unescape(t)).strip()


# ─────────────────────────── head tags ───────────────────────────

def json_ld(page):
    org = {'@type': 'Organization', 'name': 'Py Internals', 'url': SITE,
           'logo': {'@type': 'ImageObject', 'url': SITE + 'assets/images/Python-logo.png', 'width': 1024, 'height': 1024},
           'sameAs': [REPO]}
    author = {'@type': 'Person', **AUTHOR}
    course_id = SITE + '#course'
    graph = []
    if page['id'] == 'home':
        graph.append({
            '@type': 'Course', '@id': course_id,
            'name': 'Py Internals: Learn Python from the Inside Out',
            'description': page['description'],
            'url': SITE, 'image': page['og_image_url'],
            'provider': org, 'author': author,
            'inLanguage': 'en', 'isAccessibleForFree': True,
            'license': REPO + '/blob/main/LICENSE',
            'datePublished': SESSIONS[0]['published'], 'dateModified': page['modified'],
            'educationalLevel': 'Beginner',
            'about': ['Python (programming language)', 'CPython internals', 'memory model'],
            'keywords': 'python, python internals, memory model, reference counting, closures, decorators, generators, GIL, exceptions',
            'teaches': [t for s in SESSIONS for t in s['teaches']],
            'offers': [{'@type': 'Offer', 'category': 'Free', 'price': 0, 'priceCurrency': 'USD', 'availability': 'https://schema.org/InStock'}],
            'hasCourseInstance': [{'@type': 'CourseInstance', 'courseMode': 'online', 'courseWorkload': 'PT5H'}],
            'hasPart': [{'@type': 'LearningResource', 'name': f"Session {s['num']}: {s['h1']}", 'url': s['url']} for s in SESSIONS],
        })
        graph.append({'@type': 'WebSite', 'name': 'Py Internals', 'url': SITE, 'publisher': org, 'inLanguage': 'en'})
    elif page['id'] == 'glossary':
        graph.append(glossary_terms_ld(page))
        graph.append(breadcrumbs([('Home', SITE), ('Glossary', page['url'])]))
    else:
        s = page
        graph.append({
            '@type': ['Article', 'LearningResource'],
            '@id': s['url'] + '#lesson',
            'mainEntityOfPage': s['url'],
            'headline': f"Session {s['num']}: {s['h1']}",
            'name': f"Session {s['num']}: {s['h1']}",
            'description': s['description'],
            'image': s['og_image_url'],
            'author': author, 'publisher': org,
            'datePublished': s['published'], 'dateModified': s['modified'],
            'inLanguage': 'en', 'isAccessibleForFree': True,
            'license': REPO + '/blob/main/LICENSE',
            'isPartOf': {'@type': 'Course', '@id': course_id, 'name': 'Py Internals', 'url': SITE},
            'position': int(s['num']),
            'learningResourceType': 'Interactive lesson',
            'educationalLevel': 'Beginner',
            'timeRequired': s['time'],
            'teaches': s['teaches'],
            'about': ['Python (programming language)'],
            'keywords': ', '.join(s['teaches']),
        })
        graph.append(breadcrumbs([('Home', SITE), (f"Session {s['num']}: {s['h1']}", s['url'])]))
    data = {'@context': 'https://schema.org', '@graph': graph}
    return json.dumps(data, ensure_ascii=False, indent=2)


def breadcrumbs(items):
    return {'@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': i + 1, 'name': name, 'item': url} for i, (name, url) in enumerate(items)]}


def glossary_terms_ld(page):
    src = read('glossary.html')
    terms = []
    for m in re.finditer(r'<article class="term" id="([^"]+)"[^>]*>\s*<h3>(.*?)</h3>\s*<p>(.*?)</p>', src, re.S):
        terms.append({'@type': 'DefinedTerm', 'name': plain(m.group(2)), 'description': plain(m.group(3)),
                      'url': page['url'] + '#' + m.group(1), 'inDefinedTermSet': page['url']})
    return {'@type': 'DefinedTermSet', '@id': page['url'], 'name': 'Py Internals Glossary',
            'description': page['description'], 'url': page['url'], 'hasDefinedTerm': terms}


def head_block(page):
    og_type = 'article' if page['type'] == 'article' else 'website'
    lines = [
        f'  <link rel="canonical" href="{page["url"]}" />',
        '  <meta name="robots" content="index, follow, max-image-preview:large" />',
        f'  <meta name="author" content="{esc(AUTHOR["name"])}" />',
        f'  <meta property="og:type" content="{og_type}" />',
        '  <meta property="og:site_name" content="Py Internals" />',
        '  <meta property="og:locale" content="en_GB" />',
        f'  <meta property="og:url" content="{page["url"]}" />',
        f'  <meta property="og:title" content="{esc(page["og_title"])}" />',
        f'  <meta property="og:description" content="{esc(page["description"])}" />',
        f'  <meta property="og:image" content="{page["og_image_url"]}" />',
        '  <meta property="og:image:width" content="1200" />',
        '  <meta property="og:image:height" content="630" />',
        f'  <meta property="og:image:alt" content="{esc(page["og_title"])} on Py Internals" />',
    ]
    if og_type == 'article':
        lines += [
            f'  <meta property="article:published_time" content="{page["published"]}" />',
            f'  <meta property="article:modified_time" content="{page["modified"]}" />',
            f'  <meta property="article:section" content="{esc(page["section"])}" />',
            f'  <meta property="article:author" content="{AUTHOR["url"]}" />',
        ]
    lines += [
        '  <meta name="twitter:card" content="summary_large_image" />',
        f'  <meta name="twitter:title" content="{esc(page["og_title"])}" />',
        f'  <meta name="twitter:description" content="{esc(page["description"])}" />',
        f'  <meta name="twitter:image" content="{page["og_image_url"]}" />',
        f'  <link rel="alternate" type="application/atom+xml" title="Py Internals sessions" href="{SITE}feed.xml" />',
        f'  <link rel="manifest" href="{SITE}manifest.webmanifest" />',
        '  <link rel="preconnect" href="https://fonts.googleapis.com" />',
        '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
        f'  <link rel="stylesheet" href="{FONTS}" />',
        '  <script type="application/ld+json">',
        json_ld(page),
        '  </script>',
    ]
    return '\n'.join(lines)


def update_head(page):
    text = read(page['file'])
    text, n = re.subn(r'<title>.*?</title>', f'<title>{esc(page["title"])}</title>', text, count=1, flags=re.S)
    assert n == 1, page['file']
    text, n = re.subn(r'<meta name="description" content="[^"]*" />', f'<meta name="description" content="{esc(page["description"])}" />', text, count=1)
    assert n == 1, page['file']
    # drop any old, hand-written canonical / og / twitter tags outside the managed block
    managed = re.compile(r'<!-- seo:head -->.*?<!-- /seo:head -->', re.S)
    saved = managed.search(text)
    stripped = managed.sub('@@SEO@@', text) if saved else text
    stripped = re.sub(r'  <(?:link rel="canonical"|meta property="og:[^"]*"|meta name="twitter:[^"]*")[^>]*/>\n', '', stripped)
    if saved:
        text = stripped.replace('@@SEO@@', saved.group(0))
    else:
        text = stripped
    block = '<!-- seo:head -->\n' + head_block(page) + '\n  <!-- /seo:head -->'
    if '<!-- seo:head -->' in text:
        text = managed.sub(lambda m: block, text, count=1)
    else:
        text = text.replace('</head>', '  ' + block + '\n</head>', 1)
    write(page['file'], text)


# ─────────────────────────── footer nav on sessions ───────────────────────────

def sessions_nav(current):
    items = []
    for s in SESSIONS:
        cls = ' class="is-current"' if s['id'] == current['id'] else ''
        items.append(f'        <li{cls}><a href="../{s["id"]}/"><span>{s["num"]}</span> {esc(s["h1"])}</a></li>')
    return ('<!-- seo:sessions-nav -->\n'
            '    <nav class="sessions-nav" aria-label="All sessions">\n'
            '      <div class="sessions-nav__label">All sessions</div>\n'
            '      <ul>\n' + '\n'.join(items) + '\n      </ul>\n'
            '    </nav>\n    <!-- /seo:sessions-nav -->')


def update_404():
    text = read('404.html')
    items = '\n'.join(f'    <li><a href="/Py-Internals/sessions/{s["id"]}/"><span>{s["num"]}</span> {esc(s["h1"])}</a></li>' for s in SESSIONS)
    block = '<!-- seo:404-sessions -->\n' + items + '\n    <!-- /seo:404-sessions -->'
    text, n = re.subn(r'<!-- seo:404-sessions -->.*?<!-- /seo:404-sessions -->', lambda m: block, text, count=1, flags=re.S)
    assert n == 1, '404.html is missing its seo:404-sessions markers'
    write('404.html', text)


def update_nav(page):
    text = read(page['file'])
    block = sessions_nav(page)
    if '<!-- seo:sessions-nav -->' in text:
        text = re.sub(r'<!-- seo:sessions-nav -->.*?<!-- /seo:sessions-nav -->', lambda m: block, text, count=1, flags=re.S)
    else:
        text = text.replace('    <div class="session-footer">', '    ' + block + '\n\n    <div class="session-footer">', 1)
    write(page['file'], text)


# ─────────────────────────── root files ───────────────────────────

def write_sitemap():
    rows = []
    for p in PAGES:
        prio = '1.0' if p['id'] == 'home' else '0.8' if 'num' in p else '0.6'
        rows.append(f"  <url>\n    <loc>{p['url']}</loc>\n    <lastmod>{p['modified']}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>{prio}</priority>\n  </url>")
    write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + '\n'.join(rows) + '\n</urlset>\n')


def write_robots():
    write('robots.txt', f"User-agent: *\nAllow: /\n\nSitemap: {SITE}sitemap.xml\n")


def write_feed():
    entries = []
    for s in sorted(SESSIONS, key=lambda x: x['published'], reverse=True):
        entries.append(
            f"  <entry>\n    <title>Session {s['num']}: {esc(s['h1'])}</title>\n    <link href=\"{s['url']}\" />\n"
            f"    <id>{s['url']}</id>\n    <published>{s['published']}T00:00:00Z</published>\n    <updated>{s['modified']}T00:00:00Z</updated>\n"
            f"    <summary>{esc(s['description'])}</summary>\n    <category term=\"{esc(s['section'])}\" />\n  </entry>")
    feed = ('<?xml version="1.0" encoding="utf-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom">\n'
            f'  <title>Py Internals</title>\n  <subtitle>An open-source, interactive Python course that shows what your code does in memory.</subtitle>\n'
            f'  <link href="{SITE}" />\n  <link rel="self" href="{SITE}feed.xml" />\n  <id>{SITE}</id>\n'
            f'  <updated>{max(s["modified"] for s in SESSIONS)}T00:00:00Z</updated>\n  <author><name>{esc(AUTHOR["name"])}</name><uri>{AUTHOR["url"]}</uri></author>\n'
            + '\n'.join(entries) + '\n</feed>\n')
    write('feed.xml', feed)


def write_manifest():
    data = {
        'name': 'Py Internals', 'short_name': 'Py Internals',
        'description': 'Learn Python from the inside out: an interactive course that shows what your code does in memory.',
        'start_url': SITE, 'scope': SITE, 'display': 'standalone',
        'background_color': '#FAFAF7', 'theme_color': '#1A6B5C', 'lang': 'en',
        'icons': [{'src': SITE + 'assets/images/Python-logo.png', 'sizes': '1024x1024', 'type': 'image/png', 'purpose': 'any'}],
    }
    write('manifest.webmanifest', json.dumps(data, indent=2) + '\n')


# ─────────────────────────── llms.txt ───────────────────────────

def write_llms():
    lines = ['# Py Internals', '',
             '> A free, open-source, interactive Python course. Every concept is paired with an animated memory diagram (names, objects, frames, references, refcounts), followed by a plain-English narrative and a short quiz. Pure static HTML, CSS and JavaScript, hosted on GitHub Pages.', '',
             f'The full text of every session and the glossary is in [llms-full.txt]({SITE}llms-full.txt). Source and licence: [{REPO}]({REPO}) (Py Internals Community License: free for educational use with attribution).', '',
             '## Sessions', '']
    for s in SESSIONS:
        lines.append(f"- [Session {s['num']}: {s['h1']}]({s['url']}): {s['description']}")
    lines += ['', '## Reference', '',
              f"- [Glossary]({SITE}glossary.html): plain-English definitions for every term the course uses, grouped by topic.",
              f"- [Implementation guide]({REPO}/blob/main/IMPLEMENTATION_GUIDE.md): how the memory visualiser and the session format work, for contributors.",
              '', '## Optional', '',
              f"- [Atom feed]({SITE}feed.xml): one entry per session.",
              f"- [Sitemap]({SITE}sitemap.xml)", '']
    write('llms.txt', '\n'.join(lines))


class ToMarkdown(HTMLParser):
    """A small HTML to Markdown converter for the narrative sections of a page."""
    VOID = {'br', 'img', 'meta', 'link', 'input', 'hr', 'path', 'circle', 'rect'}
    SKIP_TAGS = {'script', 'style', 'svg', 'button', 'select', 'option', 'nav', 'aside', 'header', 'h1'}
    SKIP_CLASSES = ('demo-selector', 'playback-controls', 'demo-guide', 'mem-legend', 'progress-bar',
                    'code-block__header', 'session-hero__breadcrumb', 'session-hero__eyebrow', 'session-meta',
                    'concept-chip-row', 'learning-path__num', 'learning-outcome__num', 'stage-intro',
                    'demo-watch', 'step-track', 'explanation-strip', 'session-footer', 'sessions-nav', 'quiz',
                    'panel-header', 'stage', 'callout__icon', 'key-idea__icon')
    LABELS = ('try-this__label', 'recap-box__label', 'learning-card__label', 'rule-card__label', 'section-label',
              'in-plain__label', 'callout__title', 'lookup-path__where', 'type-card__mutability')
    BLOCKS = ('lookup-path__step', 'mistake-item', 'flow-card', 'rule-card', 'diagram-card', 'learning-path__step',
              'learning-outcome', 'mental-model__card', 'type-card', 'key-idea', 'callout', 'try-this', 'recap-box',
              'reference-map__row', 'learning-card')

    def __init__(self):
        super().__init__()
        self.out = []
        self.stack = []          # open tags
        self.skip_from = None    # stack depth at which skipping started
        self.cell = None         # current table cell text, when inside a row
        self.row = None
        self.row_is_header = False

    def _skipping(self):
        return self.skip_from is not None

    def handle_starttag(self, tag, attrs):
        if tag in self.VOID:
            if tag == 'br' and not self._skipping():
                self.out.append('\n')
            return
        cls = dict(attrs).get('class', '').split()
        self.stack.append(tag)
        if self._skipping():
            return
        if tag in self.SKIP_TAGS or any(c in cls for c in self.SKIP_CLASSES):
            self.skip_from = len(self.stack)
            return
        if tag == 'h2': self.out.append('\n\n## ')
        elif tag == 'h3': self.out.append('\n\n### ')
        elif tag == 'p': self.out.append('\n\n')
        elif tag == 'li': self.out.append('\n- ')
        elif tag in ('code', 'kbd'): self.out.append('`')
        elif tag == 'strong': self.out.append('**')
        elif tag == 'em': self.out.append('*')
        elif tag == 'table': self.out.append('\n')
        elif tag == 'tr': self.row = []; self.row_is_header = False
        elif tag in ('td', 'th'):
            self.cell = ''
            if tag == 'th': self.row_is_header = True
        elif tag in ('div', 'span'):
            if 'code-block__body' in cls: self.out.append('\n\n```python\n')
            elif any(c in cls for c in self.LABELS): self.out.append('\n\n**')
            elif 'callout__body' in cls: self.out.append('\n')
            elif 'section-divider__label' in cls: self.out.append('\n\n---\n\n')
            elif any(c in cls for c in self.BLOCKS): self.out.append('\n\n')

    def handle_endtag(self, tag):
        if tag in self.VOID:
            return
        while self.stack and self.stack[-1] != tag:
            self.stack.pop()
        if self.stack:
            self.stack.pop()
        if self._skipping():
            if len(self.stack) < self.skip_from:
                self.skip_from = None
            return
        if tag in ('code', 'kbd'): self.out.append('`')
        elif tag == 'strong': self.out.append('**')
        elif tag == 'em': self.out.append('*')
        elif tag in ('td', 'th'):
            self.row.append(re.sub(r'\s+', ' ', self.cell or '').strip()); self.cell = None
        elif tag == 'tr':
            self.out.append('\n| ' + ' | '.join(self.row) + ' |')
            if self.row_is_header:
                self.out.append('\n|' + '|'.join([' --- '] * len(self.row)) + '|')
            self.row = None
        elif tag in ('h2', 'h3'):
            self.out.append('\n')

    def handle_data(self, data):
        if self._skipping():
            return
        if self.cell is not None:
            self.cell += data
            return
        self.out.append(data)

    def text(self):
        t = html.unescape(''.join(self.out))
        # the label divs opened a bold marker; the label text runs to the end of its line
        t = re.sub(r'\n\*\*([^\n*]{1,60})\n', r'\n**\1**\n', t)
        # the code-block body div opened a fence; close it before the next block
        t = re.sub(r'```python\n(.*?)\n(?=\n\n|\n---|\n\*\*|\n#|\Z)', lambda m: '```python\n' + m.group(1) + '\n```\n', t, flags=re.S)
        t = re.sub(r'\n[ \t]+', '\n', t)
        t = re.sub(r'[ \t]+', ' ', t)
        t = re.sub(r'(#{2,3}) \n+', r'\1 ', t)   # headings whose text started on the next line
        t = re.sub(r'\n{3,}', '\n\n', t)
        return t.strip()


def page_markdown(page):
    """Narrative and learning goal of a session page as Markdown."""
    src = read(page['file'])
    main = src[src.index('<main'):src.index('</main>')]
    conv = ToMarkdown()
    conv.feed(main)
    md = conv.text()
    # a heading is one line, however the source wrapped it
    md = re.sub(r'^(#{2,3} [^\n]*(?:\n(?!\n)[^\n]*)*)', lambda m: ' '.join(m.group(1).split()), md, flags=re.M)
    return md


def quiz_markdown(page):
    src = read(page['file'])
    out = []
    for card in re.finditer(r'<div class="quiz-card" data-answer="(\d)">(.*?)</div>\s*</div>', src, re.S):
        answer = card.group(1)
        body = card.group(2)
        q = re.search(r'<div class="quiz-card__q">(.*?)</div>', body, re.S)
        opts = re.findall(r'<button class="quiz-option" data-choice="(\d)">(.*?)</button>', body, re.S)
        expl = re.search(r'<div class="quiz-explain">(.*?)$', body, re.S)
        out.append(f"**Q: {plain(q.group(1))}**")
        for choice, text in opts:
            mark = ' (correct)' if choice == answer else ''
            out.append(f"- {plain(text)}{mark}")
        if expl:
            out.append(f"\nWhy: {plain(expl.group(1))}")
        out.append('')
    return '\n'.join(out)


def demos_json(page):
    """Ask node for the demo definitions of a session so the lab text can be exported."""
    js = f"""
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8').replace(/document\\.addEventListener[\\s\\S]*$/, '') + '\\nprocess.stdout.write(JSON.stringify(DEMOS));';
new Function('require', 'process', src)(require, process);
"""
    tmp = ROOT / 'tools' / '_dump.js'
    tmp.write_text(js, encoding='utf-8')
    try:
        res = subprocess.run(['node', str(tmp), str(ROOT / 'sessions' / page['id'] / 'session.js')], capture_output=True, text=True, encoding='utf-8')
    finally:
        tmp.unlink(missing_ok=True)
    if res.returncode != 0:
        sys.exit(f"node failed for {page['id']}: {res.stderr}")
    return json.loads(res.stdout)


def demos_markdown(page):
    demos = demos_json(page)
    # the pill labels give the demo titles in order
    src = read(page['file'])
    labels = dict(re.findall(r'data-demo="(\w+)"\s*>(.*?)</button>', src))
    out = ['## Interactive lab (code and step-by-step narration)', '',
           'Each demo is a short Python program. The steps below are the text shown as the memory diagram animates.', '']
    for key, demo in demos.items():
        title = plain(labels.get(key, key))
        out.append(f"### Demo {title}")
        if demo.get('watch'):
            out.append(f"\nWatch for: {plain(demo['watch'])}\n")
        out.append('```python\n' + demo['code'] + '\n```\n')
        for i, step in enumerate(demo['steps'], 1):
            out.append(f"{i}. **{plain(step.get('title', ''))}** {plain(step.get('desc', ''))}")
        out.append('')
    return '\n'.join(out)


def write_llms_full():
    parts = ['# Py Internals: full text', '',
             f'Source: {SITE} ({REPO}). Licence: Py Internals Community License, free for educational use with attribution.',
             'This file is the complete text of every session, the demo code with its step-by-step narration, the quizzes, and the glossary, in Markdown.', '']
    for s in SESSIONS:
        parts.append(f"\n\n---\n\n# Session {s['num']}: {s['h1']}\n\nURL: {s['url']}\n\nSummary: {s['description']}\n")
        parts.append(page_markdown(s))
        parts.append('\n\n' + demos_markdown(s))
        parts.append('\n## Check yourself (quiz)\n\n' + quiz_markdown(s))
    g = read('glossary.html')
    parts.append(f"\n\n---\n\n# Glossary\n\nURL: {SITE}glossary.html\n")
    for group in re.finditer(r'<section class="glossary-group" data-group="[^"]+">\s*<h2>(.*?)</h2>(.*?)</section>', g, re.S):
        parts.append(f"\n## {plain(group.group(1))}\n")
        for term in re.finditer(r'<article class="term" id="([^"]+)"[^>]*>\s*<h3>(.*?)</h3>\s*<p>(.*?)</p>', group.group(2), re.S):
            parts.append(f"- **{plain(term.group(2))}**: {plain(term.group(3))}")
    write('llms-full.txt', '\n'.join(parts) + '\n')


# ─────────────────────────── Open Graph cards ───────────────────────────

def render_card(page):
    from PIL import Image, ImageDraw, ImageFont
    W, H = 1200, 630
    cream, teal, teal_lt, ink, ink2, ink3, border = '#FAFAF7', '#1A6B5C', '#E6F4F1', '#1A1A18', '#4A4A44', '#6E6E64', '#E2E2D8'
    fonts_dir = Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Fonts'

    def font(name, size, fallback='arial.ttf'):
        for candidate in (name, fallback):
            try:
                return ImageFont.truetype(str(fonts_dir / candidate), size)
            except OSError:
                continue
        return ImageFont.load_default()

    serif_b = font('georgiab.ttf', 60)
    sans = font('segoeui.ttf', 27)
    sans_b = font('segoeuib.ttf', 22)
    mono = font('consola.ttf', 21)
    mark = font('segoeuib.ttf', 24)

    im = Image.new('RGB', (W, H), cream)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 14, H], fill=teal)

    # wordmark
    d.rounded_rectangle([64, 52, 112, 100], radius=12, fill=teal)
    d.text((88, 76), 'Py', font=mark, fill='white', anchor='mm')
    d.text((128, 76), 'Py', font=font('georgiab.ttf', 30), fill=ink, anchor='lm')
    d.text((128 + d.textlength('Py', font=font('georgiab.ttf', 30)), 76), 'Internals', font=font('georgiab.ttf', 30), fill=teal, anchor='lm')

    # eyebrow
    d.text((64, 160), page['card_eyebrow'].upper(), font=sans_b, fill=teal)

    # title, wrapped to the left column
    title = html.unescape(page['card_title'])
    col_w = 700
    size = 60
    while True:
        f = font('georgiab.ttf', size)
        lines = []
        for para in textwrap.wrap(title, width=max(10, int(col_w / (size * 0.52)))):
            lines.append(para)
        if len(lines) <= 3 or size <= 40:
            break
        size -= 4
    y = 200
    for line in lines:
        d.text((64, y), line, font=f, fill=ink)
        y += int(size * 1.18)

    # description, two lines max
    desc = page['description']
    wrapped = textwrap.wrap(desc, width=58)[:3]
    if len(textwrap.wrap(desc, width=58)) > 3:
        wrapped[-1] = wrapped[-1].rstrip('.,;') + '...'
    y += 18
    for line in wrapped:
        d.text((64, y), line, font=sans, fill=ink2)
        y += 38

    # a small memory diagram on the right: a namespace and two heap objects
    x0, y0 = 860, 150
    d.rounded_rectangle([x0, y0, x0 + 280, y0 + 118], radius=10, fill='white', outline=border, width=2)
    d.rectangle([x0, y0, x0 + 280, y0 + 34], fill='#F4F4EF')
    d.text((x0 + 14, y0 + 17), 'namespace', font=sans_b, fill=ink2, anchor='lm')
    d.text((x0 + 14, y0 + 58), 'x   ->  0x7f10a0c0', font=mono, fill='#1A4B6B', anchor='lm')
    d.text((x0 + 14, y0 + 92), 'nums ->  0x7f60f010', font=mono, fill='#1A4B6B', anchor='lm')

    def heap_box(y, chip, chip_fill, chip_ink, value, refs):
        d.rounded_rectangle([x0, y, x0 + 280, y + 96], radius=10, fill='white', outline=border, width=2)
        d.rectangle([x0, y, x0 + 6, y + 96], fill=teal)
        d.rounded_rectangle([x0 + 18, y + 12, x0 + 18 + 18 + int(d.textlength(chip, font=sans_b)), y + 38], radius=13, fill=chip_fill)
        d.text((x0 + 27, y + 25), chip, font=sans_b, fill=chip_ink, anchor='lm')
        d.text((x0 + 264, y + 25), f'refs: {refs}', font=mono, fill=ink3, anchor='rm')
        d.text((x0 + 18, y + 68), value, font=mono, fill=ink, anchor='lm')

    heap_box(y0 + 140, 'int', '#EBF4FC', '#1A5C8A', '42', '\u221e')
    heap_box(y0 + 252, 'list', '#EBF5FC', '#1A6B8A', '[10, 20, 30]', '1')
    # arrows from the namespace rows to the boxes
    d.line([x0 + 240, y0 + 58, x0 + 300, y0 + 58, x0 + 300, y0 + 188, x0 + 282, y0 + 188], fill='#B85C1A', width=3)
    d.line([x0 + 258, y0 + 92, x0 + 316, y0 + 92, x0 + 316, y0 + 300, x0 + 282, y0 + 300], fill='#B85C1A', width=3)

    # footer
    d.line([64, 560, W - 64, 560], fill=border, width=2)
    d.text((64, 590), 'inboxpraveen.github.io/Py-Internals', font=sans_b, fill=ink3, anchor='lm')
    d.text((W - 64, 590), 'Free · Open source · No account needed', font=sans_b, fill=teal, anchor='rm')

    out = ROOT / page['og_image']
    out.parent.mkdir(parents=True, exist_ok=True)
    im.save(out, optimize=True)
    print('wrote', page['og_image'], f'{out.stat().st_size // 1024} KB')


# ─────────────────────────── main ───────────────────────────

def main():
    only = set(sys.argv[1:])
    stamp_dates()
    for page in PAGES:
        update_head(page)
        if 'num' in page:
            update_nav(page)
        if not only or 'cards' in only:
            render_card(page)
    update_404()
    write_sitemap()
    write_robots()
    write_feed()
    write_manifest()
    write_llms()
    write_llms_full()


if __name__ == '__main__':
    main()
