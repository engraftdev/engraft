from distutils.core import setup

setup(
  name='engraft',
  packages=['engraft'],
  version='0.1',
  license='MIT',
  description='Python embedding of Engraft',
  author='Engraft Team',
  author_email='',
  url='https://github.com/joshuahhh/engraft',
  download_url='eventual pypi url',
  keywords=['engraft', 'live programming', 'composability'],
  install_requires=[
    'numpy',
  ],
  classifiers=[
    'Development Status :: 3 - Alpha',
    'Intended Audience :: Developers',
    'Topic :: Software Development :: Build Tools',
    'License :: OSI Approved :: MIT License',
    'Programming Language :: Python :: 3',
    'Programming Language :: Python :: 3.4',
    'Programming Language :: Python :: 3.5',
    'Programming Language :: Python :: 3.6',
  ],
)