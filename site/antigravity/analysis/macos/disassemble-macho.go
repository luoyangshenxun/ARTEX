// Copy beside arm64asm from the local Go toolchain before building; see VERIFICATION.txt.
// Reads a Mach-O and its renamed Go pclntab without modifying or running the sample.
package main

import (
	"debug/macho"
	"encoding/binary"
	"fmt"
	"os"
	"regexp"
	"strconv"
	"strings"

	"./arm64asm"
)

type function struct {
	name       string
	start, end uint64
}

func main() {
	if len(os.Args) < 3 {
		panic("usage: disassemble-macho MACHO FUNCTION_REGEX")
	}
	data, err := os.ReadFile(os.Args[1])
	if err != nil {
		panic(err)
	}
	m, err := macho.Open(os.Args[1])
	if err != nil {
		panic(err)
	}
	defer m.Close()
	section := m.Section("__lrodata_gopcln")
	if section == nil {
		section = m.Section("__gopclntab")
	}
	if section == nil {
		panic("Go pclntab not found")
	}
	pcln, err := section.Data()
	if err != nil {
		panic(err)
	}
	u64 := func(off int) uint64 { return binary.LittleEndian.Uint64(pcln[off:]) }
	u32 := func(off int) uint32 { return binary.LittleEndian.Uint32(pcln[off:]) }
	if u32(0) != 0xfffffff1 || pcln[7] != 8 {
		panic("unsupported Go pclntab")
	}
	text := m.Section("__text")
	base := u64(24)
	if base == 0 {
		base = text.Addr
	}
	names, table := int(u64(32)), int(u64(64))
	functions := make([]function, int(u64(8)))
	byAddr := map[uint64]string{}
	for i := range functions {
		entry := table + i*8
		start := base + uint64(u32(entry))
		end := base + uint64(u32(entry+8))
		functionOffset := table + int(u32(entry+4))
		nameOffset := names + int(u32(functionOffset+4))
		stop := nameOffset
		for pcln[stop] != 0 {
			stop++
		}
		name := string(pcln[nameOffset:stop])
		functions[i] = function{name, start, end}
		byAddr[start] = name
	}
	resolve := func(addr uint64) int {
		for _, s := range m.Sections {
			if s.Offset != 0 && addr >= s.Addr && addr < s.Addr+s.Size {
				return int(uint64(s.Offset) + addr - s.Addr)
			}
		}
		return -1
	}
	preview := func(addr uint64) string {
		off := resolve(addr)
		if off < 0 {
			return ""
		}
		end := off
		for end < len(data) && end-off < 140 && data[end] >= 32 && data[end] < 127 {
			end++
		}
		if end-off < 3 {
			return ""
		}
		return fmt.Sprintf(" ref=0x%x file=%d %s", addr, off, strconv.Quote(string(data[off:end])))
	}
	pattern := regexp.MustCompile(os.Args[2])
	fmt.Printf("PCLNTAB_FUNCTIONS=%d TEXT_BASE=0x%x\n", len(functions), base)
	for _, f := range functions {
		if !pattern.MatchString(f.name) {
			continue
		}
		fmt.Printf("\nFUNCTION %s VA=0x%x FILE=%d SIZE=%d\n", f.name, f.start, resolve(f.start), f.end-f.start)
		known := map[uint32]uint64{}
		for pc := f.start; pc < f.end; pc += 4 {
			off := resolve(pc)
			if off < 0 {
				panic("instruction outside mapped sections")
			}
			w := binary.LittleEndian.Uint32(data[off:])
			inst, err := arm64asm.Decode(data[off : off+4])
			assembly := fmt.Sprintf(".word 0x%08x", w)
			note := ""
			if err == nil {
				assembly = arm64asm.GNUSyntax(inst)
				for _, arg := range inst.Args {
					if rel, ok := arg.(arm64asm.PCRel); ok && inst.Op != arm64asm.ADRP {
						target := uint64(int64(pc) + int64(rel))
						note += fmt.Sprintf(" target=0x%x", target)
						if name, ok := byAddr[target]; ok {
							note += " " + name
						}
					}
				}
			}
			rd, rn := w&31, (w>>5)&31
			switch {
			case w&0x9f000000 == 0x90000000: // ADRP
				imm := int64(((w >> 29) & 3) | (((w >> 5) & 0x7ffff) << 2))
				if imm&(1<<20) != 0 {
					imm -= 1 << 21
				}
				known[rd] = uint64(int64(pc&^4095) + (imm << 12))
			case w&0x7f000000 == 0x11000000: // ADD (immediate)
				if value, ok := known[rn]; ok {
					imm := uint64((w >> 10) & 4095)
					if w&(1<<22) != 0 {
						imm <<= 12
					}
					known[rd] = value + imm
					note += preview(known[rd])
				} else {
					delete(known, rd)
				}
			case w&0xffc00000 == 0xf9400000: // LDR Xt,[Xn,#imm]
				if value, ok := known[rn]; ok {
					address := value + uint64((w>>10)&4095)*8
					at := resolve(address)
					if at >= 0 && at+8 <= len(data) {
						known[rd] = binary.LittleEndian.Uint64(data[at:])
						note += fmt.Sprintf(" load[0x%x]=0x%x", address, known[rd])
						note += preview(known[rd])
					}
				} else {
					delete(known, rd)
				}
			case strings.HasPrefix(assembly, "bl ") || strings.HasPrefix(assembly, "blr "):
				// Calls clobber argument registers; annotations are local references,
				// not a claim to emulate runtime control flow.
				for reg := uint32(0); reg < 19; reg++ {
					delete(known, reg)
				}
			default:
				if err == nil {
					if reg, ok := inst.Args[0].(arm64asm.Reg); ok && reg >= arm64asm.X0 && reg <= arm64asm.X30 {
						if inst.Op != arm64asm.STR && inst.Op != arm64asm.STP && inst.Op != arm64asm.CMP {
							delete(known, uint32(reg-arm64asm.X0))
						}
					}
				}
			}
			fmt.Printf("  %016x file=%d %08x %-40s%s\n", pc, off, w, assembly, note)
		}
	}
}
