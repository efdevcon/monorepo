# generate_kwargs parameters are taken from https://huggingface.co/meta-llama/Meta-Llama-3-8B-Instruct

import torch
from llama_index.llms.huggingface import HuggingFaceLLM
from transformers import AutoTokenizer, BitsAndBytesConfig

hf_token = "hf_"

tokenizer = AutoTokenizer.from_pretrained(
    "meta-llama/Meta-Llama-3-8B-Instruct",
    token=hf_token,
)

stopping_ids = [
    tokenizer.eos_token_id,
    tokenizer.convert_tokens_to_ids("<|eot_id|>"),
]

# Optional quantization to 4bit
quantization_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_use_double_quant=True,
)

llm = HuggingFaceLLM(
    model_name="meta-llama/Meta-Llama-3-8B-Instruct",
    model_kwargs={
        "token": hf_token,
        # "torch_dtype": torch.bfloat16,  # comment this line and uncomment below to use 4bit
        "quantization_config": quantization_config
    },
    generate_kwargs={
        "do_sample": True,
        "temperature": 0.6,
        "top_p": 0.9,
    },
    tokenizer_name="meta-llama/Meta-Llama-3-8B-Instruct",
    tokenizer_kwargs={"token": hf_token},
    stopping_ids=stopping_ids,
)

# You can deploy the model on HF Inference Endpoint and use it
# llm = HuggingFaceInferenceAPI(
#     model_name="<HF Inference Endpoint>",
#     token='<HF Token>'
# )

print('uhh')

# print('CUDA Available:', torch.cuda.is_available())

try:
    response = llm.complete("Who is Paul Graham?")
    print(response)
except Exception as e:
    print("An error occurred:", e)

print(response)