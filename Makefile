deps := lib/hoot/hoot lib/lowdown/lowdown

all: $(deps)

lib/hoot/hoot: lib/hoot
	@echo Building hoot
	@make -C lib/hoot

lib/lowdown/lowdown: lib/lowdown lib/lowdown/Makefile.configure
	@echo Building lowdown
	@make -C lib/lowdown

lib/lowdown/Makefile.configure:
	@cd lib/lowdown && ./configure

lib/hoot lib/lowdown:
	@git submodule update --init
