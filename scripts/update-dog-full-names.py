"""Update registered names in listings and profiles in both languages."""
import importlib.util
import re
from pathlib import Path

spec = importlib.util.spec_from_file_location('listing', Path(__file__).with_name('unify-dog-listing.py'))
listing = importlib.util.module_from_spec(spec)
spec.loader.exec_module(listing)
listing.PAGES += ['hr/psi/quara.html', 'hr/psi/cashmir.html', 'en/dogs/quara.html', 'en/dogs/cashmir.html']


def transform(source, hr):
    result = source
    names = {'Quara': 'Quara Tmavá Hviezda', 'Cashmir': 'Cashmir Bernerpetrinia'}
    if 'class="dog-card"' in source:
        for short, full in names.items():
            result = result.replace(f'class="dog-card-name">{short}</h4>', f'class="dog-card-name">{full}</h4>')
            result = result.replace(f'alt="{short}"', f'alt="{full}"')
            assert f'class="dog-card-name">{full}</h4>' in result
            assert f'class="dog-card-call">"{short}"</p>' in result
    else:
        for short, full in names.items():
            result = re.sub(r'\b' + short + r'\b(?! ' + re.escape(full[len(short)+1:]) + ')', full, result)
        assert '<h1>Quara Tmavá Hviezda</h1>' in result or '<h1>Cashmir Bernerpetrinia</h1>' in result
    assert result != source
    return result


if __name__ == '__main__':
    listing.transform = transform
    listing.main()
