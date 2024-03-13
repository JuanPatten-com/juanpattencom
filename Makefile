hoot-head := .git/modules/lib/hoot/refs/heads/main
down-head := .git/modules/lib/lowdown/refs/heads/master


site:
	./asdf build

watch:
	./asdf watch


lib/hoot/hoot: $(hoot-head)
	make -C lib/hoot

lib/lowdown/lowdown: $(down-head)
	cd lib/lowdown \
		&& ./configure \
		&& make

$(hoot-head) $(down-head):
	git submodule update --init

