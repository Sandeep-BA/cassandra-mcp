"""Author: Sandeep Belgavi. Build public learning pages from reviewed repository sources."""
import argparse
import html
import json
import pathlib
import re
import shutil
import markdown

ROOT = pathlib.Path(__file__).resolve().parents[1]
REPO = "https://github.com/Sandeep-BA/cassandra-mcp"
AGENTS = "https://github.com/Sandeep-BA/agent-decision-lab"
e = html.escape


def page(title, description, path, body):
    return f'''<!doctype html>
<!-- Author: Sandeep Belgavi -->
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(title)} | AICassindra</title><meta name="description" content="{e(description)}"><meta name="author" content="Sandeep Belgavi">
<link rel="canonical" href="https://aicassindra.com{path}"><meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(description)}"><meta property="og:type" content="website">
<link rel="stylesheet" href="/mcp/learning-hub.css"><script defer src="/mcp/learning-hub.js"></script></head>
<body><a class="skip" href="#main">Skip to content</a><nav aria-label="Main"><div class="wrap"><a class="brand" href="/">AICASSINDRA / LAB</a><div class="navlinks"><a href="/mcp/">MCP hub</a><a href="/mcp/catalog.html">100 servers</a><a href="/mcp/agents.html">100 agents</a><a href="/blogs/decision_systems/index.html">Decision systems</a></div></div></nav>
<main id="main">{body}</main><footer class="sitefooter"><div class="wrap">Built by <strong>Sandeep Belgavi</strong>. Source-backed guides and inspectable code.<br><a href="/about.html">About</a> · <a href="/contact.html">Contact</a> · <a href="/privacy.html">Privacy</a> · <a href="{REPO}">MCP repository</a> · <a href="{AGENTS}">Agent repository</a></div></footer></body></html>'''


def hero(kicker, title, description, actions=""):
    return f'<header class="hero"><div class="wrap"><div class="eyebrow">{e(kicker)}</div><h1>{e(title)}</h1><p class="lead">{e(description)}</p>{actions}</div></header>'


def diagram(labels, title):
    height = 30 + len(labels) * 82
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 {height}" role="img" aria-labelledby="title desc"><title id="title">{e(title)}</title><desc id="desc">Proposed application flow: {e(" then ".join(labels))}. Not a model-internals diagram.</desc><rect width="440" height="{height}" rx="18" fill="#edf4f7"/>']
    for i, label in enumerate(labels):
        y = 18 + i * 82
        parts.append(f'<rect x="25" y="{y}" width="390" height="58" rx="10" fill="{("#102b3e" if i == 0 else "#ffffff")}" stroke="#bccfd9"/><circle cx="52" cy="{y+29}" r="15" fill="#087d78"/><text x="52" y="{y+34}" text-anchor="middle" fill="white" font-family="system-ui,sans-serif" font-size="13">{i+1}</text><text x="82" y="{y+35}" fill="{("white" if i == 0 else "#162333")}" font-family="system-ui,sans-serif" font-size="16">{e(label)}</text>')
        if i < len(labels)-1:
            parts.append(f'<path d="M220 {y+59} v17 m-5 -5 5 5 5 -5" stroke="#087d78" fill="none" stroke-width="2"/>')
    return '<!-- Author: Sandeep Belgavi -->\n' + "".join(parts) + '</svg>'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--agent-root', type=pathlib.Path, required=True)
    parser.add_argument('--output', type=pathlib.Path, required=True)
    args = parser.parse_args()
    out = args.output.resolve()
    out.mkdir(parents=True, exist_ok=True)
    def write(path, value):
        target = out / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(value, encoding='utf-8')
    snapshot = json.loads((ROOT / 'catalog/servers.json').read_text(encoding='utf-8'))
    servers = snapshot['servers']
    recipes = json.loads((args.agent_root / 'src/main/resources/agents.json').read_text(encoding='utf-8'))
    articles = sorted((args.agent_root / 'articles').glob('[0-9]*.md'))
    assert len(servers) == 100 and len(recipes) == 100 and len(articles) == 12
    for asset in ('learning-hub.css', 'learning-hub.js'):
        write('mcp/' + asset, (ROOT / 'site' / asset).read_text(encoding='utf-8'))
    actions = f'<div class="actions"><a class="button" href="{REPO}">Clone the MCP toolkit</a><a class="button secondary" href="{AGENTS}">Explore agent code</a></div><div class="stats"><div><strong>3</strong><span>Cassandra runtimes</span></div><div><strong>100</strong><span>Upstream MCP projects</span></div><div><strong>100</strong><span>Runnable agent recipes</span></div><div><strong>12</strong><span>Architecture guides</span></div></div>'
    intro = hero('Open source / MCP & decision systems', 'Tools you can inspect. Agents you can test.', 'Build with bounded Cassandra tools, compare MCP projects, and explore typed decision agents in Java. Every implementation has a clear scope and a testable contract.', actions)
    intro += f'''<section><div class="wrap"><div class="sectionhead"><div><div class="eyebrow">A useful place to start</div><h2>Choose your next build.</h2></div><p class="note">Original code by Sandeep Belgavi. External projects retain their own authors and licenses.</p></div><div class="grid">
<article class="card"><span class="tag">Database tools</span><h3>Cassandra, three ways</h3><p>List permitted tables, inspect schema and read a bounded partition. Node.js, Python and Java share the same three-tool contract.</p><div class="footer"><a href="#runtimes">Choose a runtime</a></div></article>
<article class="card"><span class="tag">Researched directory</span><h3>100 MCP projects</h3><p>Filter by task and language. Inspect upstream documentation, licenses and a dated popularity snapshot before installing anything.</p><div class="footer"><a href="/mcp/catalog.html">Browse the catalog</a></div></article>
<article class="card"><span class="tag">Java agents</span><h3>100 bounded recipes</h3><p>Support, security, cloud, data and more. Run synthetic examples or connect the optional Jev adapter with your own key.</p><div class="footer"><a href="/mcp/agents.html">Find a recipe</a></div></article></div>
<div class="notice"><strong>What is available:</strong> source releases and tested local code. Cassandra live-cluster validation and paid Jev calls have not been performed. Agent recipes produce recommendations; they do not execute business effects. No npm package or hosted MCP endpoint is advertised.</div></div></section>'''
    intro += '<section id="runtimes"><div class="wrap"><div class="eyebrow">One contract / three implementations</div><h2>Run Cassandra MCP your way.</h2><p class="note">Use a dedicated SELECT-only role, exact table allowlists and TLS. Credentials belong in your client’s secret configuration.</p><div data-tabs><div class="tabs" role="tablist" aria-label="Cassandra runtime">'
    for name in ('Node.js', 'Python', 'Java'):
        key = name.lower().replace('.', '')
        intro += f'<button type="button" role="tab" id="tab-{key}" aria-controls="panel-{key}" aria-selected="false">{name}</button>'
    intro += '</div>'
    for key, name, command, link, requirement in [
        ('nodejs', 'Node.js', 'git clone https://github.com/Sandeep-BA/cassandra-mcp.git\ncd cassandra-mcp\ngit checkout v0.2.0\nnpm ci --ignore-scripts\nnpm test', REPO+'#install', 'Node.js 22 or newer. Launch src/cli.js through your MCP client.'),
        ('python', 'Python', 'python -m venv implementations/python/.venv\n# Use the venv interpreter: bin/python on POSIX, Scripts/python.exe on Windows\n<venv-python> -m pip install -e "implementations/python[test]"\n<venv-python> -m pytest implementations/python/tests', REPO+'/tree/main/implementations/python', 'Python 3.11 or 3.12. Commands run from the cloned repository; replace <venv-python> with its path.'),
        ('java', 'Java', 'mvn -f implementations/java/pom.xml verify\njava -jar implementations/java/target/cassandra-mcp.jar', REPO+'/tree/main/implementations/java', 'Java 17+ and Maven 3.9+. Commands run from the cloned repository. The JAR waits for an MCP client.')]:
        intro += f'<div class="tab-panel" id="panel-{key}" role="tabpanel" aria-labelledby="tab-{key}"><h3>{name} setup</h3><p>{e(requirement)}</p><pre><code>{e(command)}</code></pre><a href="{link}">Configuration, supported types and limits →</a></div>'
    intro += f'''</div></div></section><section><div class="wrap split"><article class="card"><span class="tag">Reusable guidance</span><h2>Skills for careful integration.</h2><p>Three focused skills cover server selection, Cassandra setup and contract testing. They are instructions for an agent—not software installers or account permissions.</p><a href="{REPO}/tree/main/skills">Read and install the skills →</a></article><article class="card"><span class="tag">Engineering series</span><h2>Jev, LLMs and decision systems.</h2><p>Twelve source-linked guides cover contracts, calibration, abuse prevention, Java adapters, ADK composition, evaluation and proposed GCP deployment.</p><a href="/blogs/decision_systems/index.html">Read the architecture series →</a></article></div></section><section><div class="wrap"><h2>Learn the protocol by doing.</h2><p>Continue with the <a href="/labs/mcp/tool_registry.html">tool registry lab</a>, <a href="/blogs/mcp/index.html">MCP articles</a> and <a href="/blogs/cassandra/index.html">Cassandra engineering guides</a>. The browser labs use synthetic scenarios and do not connect to your database.</p></div></section>'''
    write('mcp/index.html', page('MCP & Agent Engineering Hub', 'Three Cassandra MCP runtimes, 100 researched MCP projects, 100 Java agent recipes, reusable skills and 12 decision-system guides by Sandeep Belgavi.', '/mcp/', intro))

    def controls(items, languages=False):
        categories = sorted({r['category'] for r in items})
        text = '<div class="searchbar"><label>Search projects or tasks<input type="search" data-search placeholder="Try database, browser, review…"></label><label>Category<select data-category><option value="">All categories</option>' + ''.join(f'<option>{e(c)}</option>' for c in categories) + '</select></label>'
        if languages:
            text += '<label>Primary language<select data-language><option value="">All languages</option>' + ''.join(f'<option>{e(c)}</option>' for c in sorted({r['language'] for r in items})) + '</select></label>'
        return text + '</div><p class="resultcount" data-count aria-live="polite">100 entries</p><p class="empty" data-empty hidden>No matches. Clear the search or choose another category.</p>'

    body = hero('Source-checked / curated selection', '100 MCP projects worth inspecting.', 'A practical directory ranked by repository stars within this selection. Search by task, then open the upstream documentation to assess fit and permissions.')
    body += f'<section><div class="wrap"><div class="notice">Checked {e(snapshot["checkedAt"][:10])} UTC. This is not a global top-100 ranking or security endorsement. Repository and README availability were checked; external servers were not executed. Suite stars apply to the whole repository. <a href="{REPO}/tree/main/catalog">Methodology and JSON snapshot</a>.</div><div data-catalog>{controls(servers,True)}<div class="grid">'
    for r in servers:
        body += f'<article class="card" data-entry data-category="{e(r["category"])}" data-language="{e(r["language"])}"><div class="meta"><span class="rank">#{r["rankWithinSelection"]} in selection</span><span>{r["stars"]:,} stars</span></div><span class="tag">{e(r["category"])}</span><h3>{e(r["name"])}</h3><p>{e(r["summary"])}</p><div class="meta"><span>{e(r["language"])}</span><span>{e(r["license"])}</span><span>Last push {e(r["pushedAt"][:10])}</span></div><p class="meta">{e(r["repository"])}</p><div class="footer"><a href="{e(r["url"])}">Repository</a><a href="{e(r["documentation"])}">Upstream setup</a></div></article>'
    body += '</div></div></div></section>'
    write('mcp/catalog.html', page('100 MCP Server Projects', 'Search a dated catalog of 100 public MCP server projects by task and language, with upstream sources, licenses and repository popularity.', '/mcp/catalog.html', body))
    body = hero('Java / 100 task-specific definitions', 'Start with a bounded agent.', 'Choose a use case, inspect its evidence contract, and run the shared Java runtime. Every recipe has synthetic boundary tests and an explicit review path.')
    body += f'<section><div class="wrap"><div class="notice">These are 100 runnable recipes on one runtime, not 100 deployed applications. Offline mode uses fixed fixtures, not model inference. Live mode sends selected evidence to Jev using your key. There are no business-effect tools. <a href="{AGENTS}">Clone and run the repository</a>.</div><div data-catalog>{controls(recipes)}<div class="grid">'
    for r in recipes:
        body += f'<article class="card" data-entry data-category="{e(r["category"])}"><span class="tag">{e(r["category"])}</span><h3>{e(r["name"])}</h3><p>{e(r["task"])}</p><div class="meta">Evidence: {e(", ".join(r["requiredEvidence"]))}</div><p><code>{e(r["id"])}</code></p><div class="footer"><a href="{AGENTS}/blob/main/examples/{r["id"]}.json">Example input</a><a href="{AGENTS}#quick-start">Run in Java</a></div></article>'
    body += '</div></div></div></section>'
    write('mcp/agents.html', page('100 Java Agent Recipes', 'Browse 100 bounded Java review and routing recipes with evidence contracts, synthetic tests, and an optional Jev adapter.', '/mcp/agents.html', body))
    article_cards = []
    for i, source in enumerate(articles):
        content = source.read_text(encoding='utf-8')
        title = content.splitlines()[0].removeprefix('# ')
        slug = source.stem
        path = '/blogs/decision_systems/' + slug + '.html'
        paragraphs = [p for p in content.split('\n\n') if not p.startswith(('#', 'Author:', '<!--'))]
        description = re.sub(r'\s+', ' ', paragraphs[0])
        if len(description) > 165:
            description = description[:162].rsplit(' ', 1)[0].rstrip(' ,;:') + '…'
        labels = re.search(r'<!-- diagram:(.*?) -->', content).group(1).split('|')
        write('mcp/diagrams/' + slug + '.svg', diagram(labels, title))
        content = re.sub(r'<!-- diagram:.*? -->', f'<figure><img src="/mcp/diagrams/{slug}.svg" alt="Proposed application flow: {e(" then ".join(labels))}" loading="lazy"><figcaption>Application architecture by Sandeep Belgavi. This diagram does not depict undisclosed model internals or deployed infrastructure.</figcaption></figure>', content)
        body = markdown.markdown(content, extensions=['fenced_code', 'tables', 'toc'])
        words = len(re.findall(r'\b\w+\b', re.sub('<[^>]+>', ' ', body)))
        assert words >= 500, (source, words)
        schema = json.dumps({'@context':'https://schema.org','@type':'TechArticle','headline':title,'author':{'@type':'Person','name':'Sandeep Belgavi'},'datePublished':'2026-10-18','dateModified':'2026-10-18','mainEntityOfPage':'https://aicassindra.com'+path})
        navigation = '<div class="series-nav"><a href="/blogs/decision_systems/index.html">All 12 guides</a>'
        if i+1 < len(articles): navigation += f'<a href="{articles[i+1].stem}.html">Next guide →</a>'
        navigation += f'<a href="{AGENTS}/blob/main/articles/{source.name}">Review Markdown source</a></div>'
        body = f'<article class="article"><div class="eyebrow">Decision systems / guide {i+1:02d}</div>{body}{navigation}</article><script type="application/ld+json">{schema}</script>'
        write(path.lstrip('/'), page(title, description, path, body).replace('<meta property="og:type" content="website">','<meta property="og:type" content="article"><meta name="date" content="2026-10-18">'))
        article_cards.append(f'<a class="card" href="{slug}.html"><span class="tag">Guide {i+1:02d}</span><h3>{e(title)}</h3><p>{e(description)}</p></a>')
    body = hero('Twelve engineering guides / Sandeep Belgavi', 'Build the decision layer with evidence.', 'Jev, language models and ordinary code have different jobs. Explore contracts, architecture, calibration, Java implementation and deployment boundaries with inspectable examples.')
    body += f'<section><div class="wrap"><div class="notice">Reviewed 18 October 2026 against primary documentation. Diagrams describe proposed application designs. Code tests use fixtures; no paid Jev benchmark or production deployment is claimed.</div><div class="grid">{"".join(article_cards)}</div></div></section>'
    write('blogs/decision_systems/index.html', page('Jev & Typed Decision Systems: 12 Engineering Guides', 'A source-linked series on Jev, LLMs, SLMs, Java adapters, calibration, abuse prevention and agent architecture by Sandeep Belgavi.', '/blogs/decision_systems/index.html', body))
    print(f'Built MCP hub, 100-server catalog, 100-agent browser, 12 articles and 12 diagrams in {out}')


if __name__ == '__main__':
    main()
