# 03, GPU lane (DORMANT)

This solution does not require a GPU at the moment. TailWatch's training is modest (a small 1-D CNN + a conv-AE over
patches from 16 synthetic scenes, minutes on CPU). `requirements-gpu.txt` is a dormant placeholder.

Activate only if a future heavy increment (a much larger scene set, a deeper spatiotemporal model, or real
multi-frame SAR) makes training slow: install the CUDA torch build, document the pin in `requirements-gpu.txt` + this
guide, and keep the CPU path as the default reproducible lane.
