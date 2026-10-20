"""Keep dogs owned by others in a separate listing section."""
import re
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location('listing', Path(__file__).with_name('unify-dog-listing.py'))
listing = importlib.util.module_from_spec(spec)
spec.loader.exec_module(listing)


def transform(source, hr):
    start = source.index('        <div class="breed-section" data-anim>')
    end = source.index('\n      </div>\n    </section>', start)
    cards = re.findall(r'<a\b[^>]*class="dog-card"[^>]*>.*?</a>', source[start:end], re.S)
    assert len(cards) == 15
    cavaliers, pomeranians, external = [], [], []
    for card in cards:
        if re.search(r'href="(?:psi|dogs)/(?:archie|charlie|zywoo)"', card):
            external.append(card)
        elif '<p class="dog-card-breed">Pomeranian</p>' in card:
            pomeranians.append(card)
        else:
            cavaliers.append(card)
    assert len(external) == 3 and len(cavaliers) == 8 and len(pomeranians) == 4

    def section(title, group):
        return ('        <div class="breed-section" data-anim>\n'
                '          <div class="breed-heading">\n'
                '            <div class="breed-heading-line"></div>\n'
                f'            <h3>{title}</h3>\n'
                '            <div class="breed-heading-line right"></div>\n'
                '          </div>\n'
                '          <div class="cards-grid">\n\n'
                + '\n\n'.join('            ' + card for card in group)
                + '\n\n          </div>\n        </div>\n')

    replacement = section('Cavalier King Charles španijeli' if hr else 'Cavalier King Charles Spaniels', cavaliers)
    replacement += '\n' + section('Pomeranci' if hr else 'Pomeranians', pomeranians)
    replacement += '\n' + section('Rasplodni mužjaci' if hr else 'Stud dogs', external)
    result = source[:start] + replacement + source[end:]
    assert sorted(cards) == sorted(re.findall(r'<a\b[^>]*class="dog-card"[^>]*>.*?</a>', result, re.S))
    assert 'memoriam' not in result.lower()
    return result


if __name__ == '__main__':
    listing.transform = transform
    listing.main()
